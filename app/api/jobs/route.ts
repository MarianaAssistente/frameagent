/**
 * /api/jobs
 * POST — Cria novo job de geração de imagem via fal.ai (BYOK)
 * GET  — Lista jobs do usuário
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptApiKey } from "@/lib/vault";
import { JobStatus } from "@/lib/redis";

// ── Modelos suportados ────────────────────────────────────────────────────────

const FAL_MODELS: Record<string, { falId: string; name: string; provider: string }> = {
  "flux-schnell": { falId: "fal-ai/flux/schnell",      name: "FLUX.2 Schnell (rápido)", provider: "fal.ai" },
  "flux-pro":     { falId: "fal-ai/flux-pro",           name: "FLUX.2 Pro (qualidade)",  provider: "fal.ai" },
  "flux-dev":     { falId: "fal-ai/flux/dev",           name: "FLUX.2 Dev",              provider: "fal.ai" },
  "recraft-v3":   { falId: "fal-ai/recraft-v3",         name: "Recraft V3",              provider: "fal.ai" },
  "ideogram-v2":  { falId: "fal-ai/ideogram/v2",        name: "Ideogram V2",             provider: "fal.ai" },
};

// Aspect ratio por tipo de job
const TYPE_DIMENSIONS: Record<string, { width: number; height: number; ar: string }> = {
  "image":  { width: 1024, height: 1024, ar: "1:1"   },
  "reel":   { width: 1080, height: 1920, ar: "9:16"  },
  "story":  { width: 1080, height: 1920, ar: "9:16"  },
  "post":   { width: 1080, height: 1350, ar: "4:5"   },
  "avatar": { width: 512,  height: 512,  ar: "1:1"   },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUserInternalId(db: ReturnType<typeof supabaseAdmin>, clerkId: string): Promise<string | null> {
  const { data } = await db
    .from("frameagent_users")
    .select("id")
    .eq("clerk_user_id", clerkId)
    .single();
  return data?.id ?? null;
}

async function getFalApiKey(db: ReturnType<typeof supabaseAdmin>, userId: string): Promise<string | null> {
  const { data } = await db
    .from("frameagent_api_keys")
    .select("key_encrypted")
    .eq("user_id", userId)
    .eq("provider", "fal.ai")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data?.key_encrypted) return null;
  try {
    return decryptApiKey(data.key_encrypted);
  } catch {
    return null;
  }
}

// ── POST /api/jobs ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { prompt, type = "image", model = "flux-schnell" } = body;

  // Validar input
  if (!prompt?.trim())
    return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 });
  if (prompt.length > 2000)
    return NextResponse.json({ error: "Prompt máximo 2000 caracteres" }, { status: 400 });

  const modelConfig = FAL_MODELS[model];
  if (!modelConfig)
    return NextResponse.json({ error: `Modelo inválido: ${model}` }, { status: 400 });

  const db = supabaseAdmin();

  // Buscar user interno
  const internalUserId = await getUserInternalId(db, clerkId);
  if (!internalUserId)
    return NextResponse.json({ error: "Usuário não encontrado. Faça login novamente." }, { status: 404 });

  // Verificar créditos
  const { data: user } = await db
    .from("frameagent_users")
    .select("credits, plan")
    .eq("id", internalUserId)
    .single();

  if (!user || user.credits < 5)
    return NextResponse.json({ error: "Créditos insuficientes. Recarregue sua conta." }, { status: 402 });

  // Buscar e decriptar API key fal.ai
  const falKey = await getFalApiKey(db, internalUserId);
  if (!falKey)
    return NextResponse.json({
      error: "Nenhuma API key fal.ai configurada. Adicione em Dashboard → API Keys.",
      code: "NO_FAL_KEY",
    }, { status: 422 });

  // Dimensões do tipo
  const dims = TYPE_DIMENSIONS[type] ?? TYPE_DIMENSIONS["image"];

  // Criar job record com status 'processing'
  const { data: job, error: jobErr } = await db
    .from("frameagent_jobs")
    .insert({
      user_id:    internalUserId,
      type:       `image_${type}`,
      status:     "processing",
      prompt,
      model:      modelConfig.falId,
      provider:   "fal.ai",
      credits_used: 5,
      metadata: { dimensions: dims, model_name: modelConfig.name },
    })
    .select("id")
    .single();

  if (jobErr || !job)
    return NextResponse.json({ error: jobErr?.message ?? "Erro ao criar job" }, { status: 500 });

  const jobId = job.id;

  // Cache status inicial no Redis
  await JobStatus.set(jobId, { state: "processing", progress: 10, message: "Enviando para fal.ai..." })
    .catch(() => {}); // não bloqueia se Redis offline

  // ── Chamar fal.ai ─────────────────────────────────────────────────────────

  let imageUrl: string | null = null;
  let falError: string | null = null;

  try {
    const falResponse = await fetch(`https://fal.run/${modelConfig.falId}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        image_size: {
          width:  dims.width,
          height: dims.height,
        },
        num_inference_steps: model === "flux-schnell" ? 4 : 28,
        num_images: 1,
        enable_safety_checker: true,
        output_format: "jpeg",
      }),
    });

    if (!falResponse.ok) {
      const errText = await falResponse.text();
      falError = `fal.ai error ${falResponse.status}: ${errText.slice(0, 200)}`;
    } else {
      const falData = await falResponse.json();
      // fal.ai retorna images[0].url
      imageUrl = falData?.images?.[0]?.url ?? falData?.image?.url ?? null;
      if (!imageUrl) falError = "fal.ai não retornou imagem";
    }
  } catch (err: any) {
    falError = `Falha na chamada fal.ai: ${err.message}`;
  }

  // ── Tratar resultado ──────────────────────────────────────────────────────

  if (falError || !imageUrl) {
    // Marcar job como failed
    await db.from("frameagent_jobs").update({
      status: "failed",
      error_message: falError,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);

    await JobStatus.set(jobId, { state: "failed", error: falError ?? "Erro desconhecido" }).catch(() => {});

    return NextResponse.json({ error: falError, job_id: jobId }, { status: 500 });
  }

  // Salvar asset
  const { data: asset } = await db
    .from("frameagent_assets")
    .insert({
      user_id:      internalUserId,
      job_id:       jobId,
      type:         "image",
      url:          imageUrl,
      filename:     `${type}_${jobId.slice(0, 8)}.jpg`,
      mime_type:    "image/jpeg",
      width:        dims.width,
      height:       dims.height,
      metadata: { prompt, model: modelConfig.falId, provider: "fal.ai" },
    })
    .select("id")
    .single();

  // Atualizar job como done
  await db.from("frameagent_jobs").update({
    status:       "done",
    output_url:   imageUrl,
    completed_at: new Date().toISOString(),
  }).eq("id", jobId);

  // Descontar créditos
  await db.from("frameagent_users").update({
    credits: user.credits - 5,
  }).eq("id", internalUserId);

  // Registrar transação
  try {
    await db.from("frameagent_credit_transactions").insert({
      user_id:     internalUserId,
      amount:      -5,
      type:        "usage",
      description: `Geração de imagem — ${modelConfig.name}`,
      job_id:      jobId,
    });
  } catch { /* não bloqueia */ }

  await JobStatus.set(jobId, { state: "done", progress: 100, result: { imageUrl, assetId: asset?.id } }).catch(() => {});

  return NextResponse.json({
    job_id:    jobId,
    asset_id:  asset?.id,
    image_url: imageUrl,
    status:    "done",
    credits_used: 5,
    credits_remaining: user.credits - 5,
  }, { status: 201 });
}

// ── GET /api/jobs ─────────────────────────────────────────────────────────────

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const internalUserId = await getUserInternalId(db, clerkId);
  if (!internalUserId) return NextResponse.json({ jobs: [] });

  const { data: jobs, error } = await db
    .from("frameagent_jobs")
    .select("id, type, status, prompt, model, output_url, credits_used, created_at, completed_at, error_message, metadata")
    .eq("user_id", internalUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jobs: jobs ?? [] });
}
