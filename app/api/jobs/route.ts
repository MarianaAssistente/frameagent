/**
 * POST /api/jobs — Edge runtime, sem timeout de 10s
 * Chama fal.ai server-side e retorna resultado
 */
// export const runtime = "edge"; // removido: edge runtime não suporta 'crypto' node module
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VAULT_SECRET = process.env.VAULT_ENCRYPTION_KEY ?? "frameagent-vault-key-2026";

function getKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function decryptKey(encrypted: string): string {
  try {
    const buf = Buffer.from(encrypted, "base64");
    const iv = buf.subarray(0, 16);
    const data = buf.subarray(16);
    const decipher = createDecipheriv("aes-256-cbc", getKey(VAULT_SECRET), iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return encrypted; // fallback: já é texto plain
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, type = "image", model = "flux-schnell" } = await req.json().catch(() => ({}));
    if (!prompt?.trim()) return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 });

    const db = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: user } = await db.from("frameagent_users").select("id,credits").eq("clerk_user_id", clerkId).single();
    if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if (user.credits < 5) return NextResponse.json({ error: "Créditos insuficientes", code: "NO_CREDITS" }, { status: 402 });

    const { data: keyRow } = await db.from("frameagent_api_keys").select("key_encrypted").eq("user_id", user.id).eq("provider", "fal.ai").eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
    if (!keyRow) return NextResponse.json({ error: "Nenhuma API key fal.ai configurada", code: "NO_FAL_KEY" }, { status: 422 });

    const falKey = decryptKey(keyRow.key_encrypted);

    const TYPE_DB: Record<string,string> = { image:"image_generation", post:"image_generation", reel:"reel_compose", story:"image_generation", avatar:"image_generation" };
    const FAL_MODELS: Record<string,string> = { "flux-schnell":"fal-ai/flux/schnell", "flux-pro":"fal-ai/flux-pro", "flux-dev":"fal-ai/flux/dev" };
    const DIMS: Record<string,{w:number,h:number}> = { image:{w:1024,h:1024}, reel:{w:1080,h:1920}, story:{w:1080,h:1920}, post:{w:1080,h:1350}, avatar:{w:512,h:512} };
    const dims = DIMS[type] ?? DIMS.image;
    const falModel = FAL_MODELS[model] ?? "fal-ai/flux/schnell";

    const { data: job } = await db.from("frameagent_jobs").insert({
      user_id: user.id, type: TYPE_DB[type] ?? "image_generation",
      status: "processing", prompt, model: falModel,
      provider: "fal.ai", credits_used: 5,
      metadata: { dimensions: dims, model_name: model }
    }).select("id").single();

    // Chamar fal.ai server-side (edge — sem CORS, sem timeout 10s)
    const falRes = await fetch(`https://fal.run/${falModel}`, {
      method: "POST",
      headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt.trim(),
        image_size: { width: dims.w, height: dims.h },
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
        output_format: "jpeg",
      }),
      signal: AbortSignal.timeout(55000),
    });

    if (!falRes.ok) {
      const txt = await falRes.text().catch(() => "");
      await db.from("frameagent_jobs").update({ status: "failed", error_message: `fal.ai ${falRes.status}: ${txt.slice(0,200)}`, completed_at: new Date().toISOString() }).eq("id", job!.id);
      return NextResponse.json({ error: `fal.ai ${falRes.status}: ${txt.slice(0,100)}` }, { status: 502 });
    }

    const falData = await falRes.json();
    const imageUrl = falData?.images?.[0]?.url ?? falData?.image?.url;

    if (!imageUrl) {
      await db.from("frameagent_jobs").update({ status: "failed", error_message: "fal.ai não retornou imagem", completed_at: new Date().toISOString() }).eq("id", job!.id);
      return NextResponse.json({ error: "fal.ai não retornou imagem" }, { status: 502 });
    }

    const { data: asset } = await db.from("frameagent_assets").insert({
      user_id: user.id, job_id: job!.id, type: "image", url: imageUrl,
      filename: `image_${job!.id.slice(0,8)}.jpg`, mime_type: "image/jpeg",
      width: dims.w, height: dims.h,
      metadata: { prompt, model: falModel, provider: "fal.ai" }
    }).select("id").single();

    await db.from("frameagent_jobs").update({ status: "done", output_url: imageUrl, completed_at: new Date().toISOString() }).eq("id", job!.id);
    await db.from("frameagent_users").update({ credits: Math.max(0, user.credits - 5) }).eq("id", user.id);

    return NextResponse.json({ ok: true, job_id: job!.id, asset_id: asset?.id, image_url: imageUrl, status: "done" }, { status: 201 });

  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro interno" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: user } = await db
      .from("frameagent_users")
      .select("id")
      .eq("clerk_user_id", clerkId)
      .single();
    if (!user) return NextResponse.json({ jobs: [] });

    const { data: jobs, error } = await db
      .from("frameagent_jobs")
      .select("id, type, status, prompt, result_url, output_url, error_message, created_at, credits_used, model, operation")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ jobs: jobs ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
