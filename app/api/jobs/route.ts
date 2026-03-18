/**
 * /api/jobs — FrameAgent
 * POST  — Cria job + chama fal.ai SÍNCRONO + salva asset + retorna asset_id
 * GET   — Lista jobs do usuário
 * PATCH — Retenta job failed
 *
 * maxDuration = 60: Vercel Pro permite até 60s (fal.ai demora 15-45s)
 */
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptApiKey } from "@/lib/vault";
import { JobStatus } from "@/lib/redis";

// ── Modelos suportados ────────────────────────────────────────────────────────

const FAL_MODELS: Record<string, { falId: string; name: string; steps: number }> = {
  "flux-schnell": { falId: "fal-ai/flux/schnell", name: "FLUX.2 Schnell", steps: 4  },
  "flux-pro":     { falId: "fal-ai/flux-pro",     name: "FLUX.2 Pro",     steps: 28 },
  "flux-dev":     { falId: "fal-ai/flux/dev",     name: "FLUX.2 Dev",     steps: 28 },
  "recraft-v3":   { falId: "fal-ai/recraft-v3",   name: "Recraft V3",     steps: 28 },
  "ideogram-v2":  { falId: "fal-ai/ideogram/v2",  name: "Ideogram V2",    steps: 28 },
};

// Mapeia tipo frontend → valor DB (constraint)
const TYPE_DB_MAP: Record<string, string> = {
  "image":  "image_generation",
  "post":   "image_generation",
  "reel":   "reel_compose",
  "story":  "image_generation",
  "avatar": "image_generation",
};

// Dimensões por tipo
const TYPE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "image":  { width: 1024, height: 1024 },
  "reel":   { width: 1080, height: 1920 },
  "story":  { width: 1080, height: 1920 },
  "post":   { width: 1080, height: 1350 },
  "avatar": { width: 512,  height: 512  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

type DB = ReturnType<typeof supabaseAdmin>;

async function getUserInternal(db: DB, clerkId: string) {
  const { data } = await db
    .from("frameagent_users")
    .select("id, credits")
    .eq("clerk_user_id", clerkId)
    .single();
  return data ?? null;
}

async function getFalKey(db: DB, userId: string): Promise<string | null> {
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
  try { return decryptApiKey(data.key_encrypted); } catch { return null; }
}

async function markFailed(db: DB, jobId: string, msg: string) {
  try {
    await db.from("frameagent_jobs").update({
      status:        "failed",
      error_message: msg.slice(0, 500),
      completed_at:  new Date().toISOString(),
    }).eq("id", jobId);
    await JobStatus.set(jobId, { state: "failed", error: msg }).catch(() => {});
  } catch { /* não bloqueia */ }
}

// ── Core síncrono ─────────────────────────────────────────────────────────────

interface GenResult {
  jobId:    string;
  assetId:  string | null;
  imageUrl: string | null;
  error?:   string;
  code?:    string;
}

async function generateSync(
  db:       DB,
  userId:   string,   // internal UUID
  prompt:   string,
  type:     string,   // frontend key: image / post / reel / story / avatar
  modelKey: string,   // flux-schnell etc.
): Promise<GenResult> {

  const model  = FAL_MODELS[modelKey];
  const dims   = TYPE_DIMENSIONS[type] ?? TYPE_DIMENSIONS["image"];
  const dbType = TYPE_DB_MAP[type]     ?? "image_generation";

  // 1. Criar job como 'processing'
  const { data: job, error: jobErr } = await db
    .from("frameagent_jobs")
    .insert({
      user_id:      userId,
      type:         dbType,
      status:       "processing",
      prompt,
      model:        model.falId,
      provider:     "fal.ai",
      credits_used: 5,
      metadata:     { dimensions: dims, model_name: model.name },
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    return { jobId: "", assetId: null, imageUrl: null, error: jobErr?.message ?? "Erro ao criar job" };
  }
  const jobId = job.id;

  // 2. Buscar e decriptar key fal.ai
  const falKey = await getFalKey(db, userId);
  if (!falKey) {
    await markFailed(db, jobId, "Nenhuma API key fal.ai configurada");
    return { jobId, assetId: null, imageUrl: null, error: "Nenhuma API key fal.ai. Adicione em API Keys.", code: "NO_FAL_KEY" };
  }

  // 3. Chamar fal.ai (síncrono, timeout 55s)
  let imageUrl: string | null = null;
  let falError: string | null = null;

  try {
    const falRes = await fetch(`https://fal.run/${model.falId}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size:              { width: dims.width, height: dims.height },
        num_inference_steps:     model.steps,
        num_images:              1,
        enable_safety_checker:   true,
        output_format:           "jpeg",
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (falRes.ok) {
      const falData = await falRes.json();
      imageUrl = falData?.images?.[0]?.url ?? falData?.image?.url ?? null;
      if (!imageUrl) falError = `fal.ai respondeu mas sem URL. Resposta: ${JSON.stringify(falData).slice(0, 200)}`;
    } else {
      const txt = await falRes.text().catch(() => "");
      falError = `fal.ai ${falRes.status}: ${txt.slice(0, 300)}`;
    }
  } catch (err: any) {
    falError = err.name === "TimeoutError"
      ? "fal.ai não respondeu em 55s (timeout)"
      : `Erro na chamada fal.ai: ${err.message}`;
  }

  if (!imageUrl || falError) {
    await markFailed(db, jobId, falError ?? "fal.ai não retornou imagem");
    return { jobId, assetId: null, imageUrl: null, error: falError ?? "fal.ai não retornou imagem" };
  }

  // 4. Salvar asset
  const { data: asset, error: assetErr } = await db
    .from("frameagent_assets")
    .insert({
      user_id:   userId,
      job_id:    jobId,
      type:      "image",
      url:       imageUrl,
      filename:  `${type}_${jobId.slice(0, 8)}.jpg`,
      mime_type: "image/jpeg",
      width:     dims.width,
      height:    dims.height,
      metadata:  { prompt, model: model.falId, provider: "fal.ai" },
    })
    .select("id")
    .single();

  if (assetErr) console.error("[jobs] asset insert:", assetErr.message);

  // 5. Marcar job como done
  await db.from("frameagent_jobs").update({
    status:       "done",
    output_url:   imageUrl,
    completed_at: new Date().toISOString(),
  }).eq("id", jobId);

  // 6. Debitar créditos
  const { data: userRow } = await db
    .from("frameagent_users")
    .select("credits")
    .eq("id", userId)
    .single();

  if (userRow) {
    await db.from("frameagent_users")
      .update({ credits: Math.max(0, userRow.credits - 5) })
      .eq("id", userId);
    try {
      await db.from("frameagent_credit_transactions").insert({
        user_id:     userId,
        amount:      -5,
        type:        "usage",
        description: `Geração de imagem — ${model.name}`,
        job_id:      jobId,
      });
    } catch { /* não bloqueia */ }
  }

  // 7. Atualizar status no Redis
  await JobStatus.set(jobId, {
    state:    "done",
    progress: 100,
    result:   { imageUrl, assetId: asset?.id ?? null },
  }).catch(() => {});

  return { jobId, assetId: asset?.id ?? null, imageUrl };
}

// ── POST /api/jobs ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { prompt = "", type = "image", model = "flux-schnell" } = body;

  if (!prompt.trim())
    return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 });
  if (prompt.length > 2000)
    return NextResponse.json({ error: "Prompt máximo 2000 caracteres" }, { status: 400 });
  if (!FAL_MODELS[model])
    return NextResponse.json({ error: `Modelo inválido: ${model}` }, { status: 400 });

  const db   = supabaseAdmin();
  const user = await getUserInternal(db, clerkId);
  if (!user)
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (user.credits < 5)
    return NextResponse.json({ error: "Créditos insuficientes", code: "NO_CREDITS" }, { status: 402 });

  const result = await generateSync(db, user.id, prompt.trim(), type, model);

  if (result.code === "NO_FAL_KEY")
    return NextResponse.json({ error: result.error, code: "NO_FAL_KEY", job_id: result.jobId }, { status: 422 });

  if (result.error)
    return NextResponse.json({ error: result.error, job_id: result.jobId }, { status: 500 });

  return NextResponse.json({
    job_id:    result.jobId,
    asset_id:  result.assetId,   // string | null — nunca undefined
    image_url: result.imageUrl,
    status:    "done",
  }, { status: 201 });
}

// ── PATCH /api/jobs — Retry ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json().catch(() => ({}));
  if (!jobId) return NextResponse.json({ error: "jobId obrigatório" }, { status: 400 });

  const db   = supabaseAdmin();
  const user = await getUserInternal(db, clerkId);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (user.credits < 5) return NextResponse.json({ error: "Créditos insuficientes", code: "NO_CREDITS" }, { status: 402 });

  // Buscar job original
  const { data: orig } = await db
    .from("frameagent_jobs")
    .select("prompt, model, type, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!orig)   return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  if (orig.status !== "failed")
    return NextResponse.json({ error: "Só é possível retentar jobs failed" }, { status: 400 });

  // Reverter tipo DB → frontend key
  const typeMap: Record<string, string> = { "image_generation": "image", "reel_compose": "reel" };
  const frontendType = typeMap[orig.type] ?? "image";
  const modelKey     = Object.entries(FAL_MODELS).find(([, v]) => v.falId === orig.model)?.[0] ?? "flux-schnell";

  const result = await generateSync(db, user.id, orig.prompt, frontendType, modelKey);

  if (result.error)
    return NextResponse.json({ error: result.error, job_id: result.jobId }, { status: 500 });

  return NextResponse.json({
    job_id:    result.jobId,
    asset_id:  result.assetId,
    image_url: result.imageUrl,
    status:    "done",
    retried:   true,
  }, { status: 201 });
}

// ── GET /api/jobs ─────────────────────────────────────────────────────────────

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db   = supabaseAdmin();
  const user = await getUserInternal(db, clerkId);
  if (!user) return NextResponse.json({ jobs: [] });

  const { data: jobs, error } = await db
    .from("frameagent_jobs")
    .select("id, type, status, prompt, model, output_url, credits_used, created_at, completed_at, error_message, metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: jobs ?? [] });
}
