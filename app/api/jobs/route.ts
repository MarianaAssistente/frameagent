/**
 * /api/jobs
 * POST — Cria novo job de geração de imagem via fal.ai (BYOK)
 * GET  — Lista jobs do usuário
 * PATCH — Retenta job failed
 *
 * IMPORTANTE: maxDuration = 60 para acomodar chamadas fal.ai (20-60s).
 * Vercel Hobby: 10s (pode dar timeout) → Vercel Pro: 60s → 300s
 */

// Aumenta timeout do Vercel Serverless para 60s (Vercel Pro/Team)
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptApiKey } from "@/lib/vault";
import { JobStatus } from "@/lib/redis";

// URL do worker Fly.io para disparo assíncrono (fallback)
const WORKER_URL    = process.env.WORKER_URL ?? "https://frameagent-worker.fly.dev";
const WORKER_SECRET = process.env.WORKER_SECRET ?? "frameagent-worker-secret-olimpo-2026";

// ── Modelos suportados ────────────────────────────────────────────────────────

const FAL_MODELS: Record<string, { falId: string; name: string; provider: string }> = {
  "flux-schnell": { falId: "fal-ai/flux/schnell", name: "FLUX.2 Schnell (rápido)", provider: "fal.ai" },
  "flux-pro":     { falId: "fal-ai/flux-pro",     name: "FLUX.2 Pro (qualidade)", provider: "fal.ai" },
  "flux-dev":     { falId: "fal-ai/flux/dev",     name: "FLUX.2 Dev",             provider: "fal.ai" },
  "recraft-v3":   { falId: "fal-ai/recraft-v3",   name: "Recraft V3",             provider: "fal.ai" },
  "ideogram-v2":  { falId: "fal-ai/ideogram/v2",  name: "Ideogram V2",            provider: "fal.ai" },
};

// Mapeia tipo do frontend → valor aceito pelo DB constraint
const TYPE_DB_MAP: Record<string, string> = {
  "image":  "image_generation",
  "post":   "image_generation",
  "reel":   "reel_compose",
  "story":  "image_generation",
  "avatar": "image_generation",
};

// Aspect ratio por tipo de job
const TYPE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "image":  { width: 1024, height: 1024 },
  "reel":   { width: 1080, height: 1920 },
  "story":  { width: 1080, height: 1920 },
  "post":   { width: 1080, height: 1350 },
  "avatar": { width: 512,  height: 512  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUserInternalId(db: ReturnType<typeof supabaseAdmin>, clerkId: string) {
  const { data } = await db
    .from("frameagent_users")
    .select("id, credits, plan")
    .eq("clerk_user_id", clerkId)
    .single();
  return data ?? null;
}

async function getFalApiKey(db: ReturnType<typeof supabaseAdmin>, userId: string) {
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

async function markJobFailed(db: ReturnType<typeof supabaseAdmin>, jobId: string, errorMsg: string) {
  try {
    await db.from("frameagent_jobs").update({
      status:        "failed",
      error_message: errorMsg,
      completed_at:  new Date().toISOString(),
    }).eq("id", jobId);
    await JobStatus.set(jobId, { state: "failed", error: errorMsg });
  } catch { /* não bloqueia */ }
}

// ── Core: geração de imagem ───────────────────────────────────────────────────

async function generateImage(
  prompt: string,
  type: string,
  model: string,
  internalUserId: string,
  db: ReturnType<typeof supabaseAdmin>,
  existingJobId?: string,   // Se já foi criado pelo POST handler
) {
  const modelConfig = FAL_MODELS[model];
  if (!modelConfig) throw new Error(`Modelo inválido: ${model}`);

  const dims   = TYPE_DIMENSIONS[type] ?? TYPE_DIMENSIONS["image"];
  const dbType = TYPE_DB_MAP[type] ?? "image_generation";

  let jobId: string;

  if (existingJobId) {
    jobId = existingJobId;
  } else {
    // Criar job como 'processing'
    const { data: job, error: jobErr } = await db
      .from("frameagent_jobs")
      .insert({
        user_id:      internalUserId,
        type:         dbType,
        status:       "processing",
        prompt,
        model:        modelConfig.falId,
        provider:     "fal.ai",
        credits_used: 5,
        metadata: { dimensions: dims, model_name: modelConfig.name },
      })
      .select("id")
      .single();

    if (jobErr || !job) throw new Error(jobErr?.message ?? "Erro ao criar job no banco");
    jobId = job.id;
  }

  await JobStatus.set(jobId, { state: "processing", progress: 10, message: "Enviando para fal.ai..." }).catch(() => {});

  // Buscar e decriptar API key fal.ai
  const falKey = await getFalApiKey(db, internalUserId);
  if (!falKey) {
    await markJobFailed(db, jobId, "Nenhuma API key fal.ai configurada");
    return { error: "Nenhuma API key fal.ai configurada. Adicione em Dashboard → API Keys.", code: "NO_FAL_KEY", jobId };
  }

  // Chamar fal.ai
  let imageUrl: string | null = null;
  let falError: string | null = null;

  try {
    const falRes = await fetch(`https://fal.run/${modelConfig.falId}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: { width: dims.width, height: dims.height },
        num_inference_steps: model === "flux-schnell" ? 4 : 28,
        num_images: 1,
        enable_safety_checker: true,
        output_format: "jpeg",
      }),
      signal: AbortSignal.timeout(60_000), // 60s timeout
    });

    if (!falRes.ok) {
      const errText = await falRes.text().catch(() => "");
      falError = `fal.ai error ${falRes.status}: ${errText.slice(0, 300)}`;
    } else {
      const falData = await falRes.json();
      imageUrl = falData?.images?.[0]?.url ?? falData?.image?.url ?? null;
      if (!imageUrl) falError = "fal.ai não retornou URL de imagem na resposta";
    }
  } catch (err: any) {
    falError = err.name === "TimeoutError"
      ? "fal.ai timeout após 60 segundos"
      : `Falha na chamada fal.ai: ${err.message}`;
  }

  if (falError || !imageUrl) {
    await markJobFailed(db, jobId, falError ?? "Sem URL de imagem");
    return { error: falError, jobId };
  }

  // Salvar asset
  const { data: asset, error: assetErr } = await db
    .from("frameagent_assets")
    .insert({
      user_id:   internalUserId,
      job_id:    jobId,
      type:      "image",
      url:       imageUrl,
      filename:  `${type}_${jobId.slice(0, 8)}.jpg`,
      mime_type: "image/jpeg",
      width:     dims.width,
      height:    dims.height,
      metadata:  { prompt, model: modelConfig.falId, provider: "fal.ai" },
    })
    .select("id")
    .single();

  if (assetErr || !asset) {
    // Job gerou imagem mas falhou ao salvar asset — ainda retornamos a URL
    console.error("[jobs] asset insert error:", assetErr?.message);
    await db.from("frameagent_jobs").update({
      status:      "done",
      output_url:  imageUrl,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);
    return { jobId, assetId: null, imageUrl, warning: "Asset não salvo no banco" };
  }

  // Atualizar job como done
  await db.from("frameagent_jobs").update({
    status:       "done",
    output_url:   imageUrl,
    completed_at: new Date().toISOString(),
  }).eq("id", jobId);

  // Debitar créditos + registrar transação
  const { data: user } = await db.from("frameagent_users").select("credits").eq("id", internalUserId).single();
  if (user) {
    await db.from("frameagent_users").update({ credits: Math.max(0, user.credits - 5) }).eq("id", internalUserId);
    try {
      await db.from("frameagent_credit_transactions").insert({
        user_id:     internalUserId,
        amount:      -5,
        type:        "usage",
        description: `Geração de imagem — ${modelConfig.name}`,
        job_id:      jobId,
      });
    } catch { /* não bloqueia */ }
  }

  await JobStatus.set(jobId, { state: "done", progress: 100, result: { imageUrl, assetId: asset.id } }).catch(() => {});

  return { jobId, assetId: asset.id, imageUrl };
}

// ── Dispara worker Fly.io e aguarda resultado (polling interno) ───────────────

async function dispatchAndWait(
  jobId: string,
  clerkUserId: string,
  prompt: string,
  type: string,
  model: string,
  db: ReturnType<typeof supabaseAdmin>,
  internalUserId: string,
): Promise<{ done: boolean; assetId?: string | null; imageUrl?: string; error?: string }> {

  const modelConfig = FAL_MODELS[model]!;

  // Payload que o worker espera
  const workerPayload = {
    id:      jobId,
    userId:  clerkUserId,
    payload: { prompt, type: TYPE_DB_MAP[type] ?? "image_generation", model: modelConfig.falId },
  };

  // Disparar worker (fire-and-forget tolerante a falha)
  let workerTriggered = false;
  try {
    const triggerRes = await fetch(`${WORKER_URL}/process`, {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        "X-Worker-Secret": WORKER_SECRET,
      },
      body:   JSON.stringify(workerPayload),
      signal: AbortSignal.timeout(8_000),
    });
    workerTriggered = triggerRes.ok;
    if (!triggerRes.ok) console.warn("[jobs] worker trigger failed:", triggerRes.status, await triggerRes.text().catch(() => ""));
  } catch (e) {
    console.warn("[jobs] worker unreachable, falling back to sync:", e);
  }

  if (!workerTriggered) {
    // Worker não respondeu — processar síncronamente como fallback
    const result = await generateImage(prompt, type, model, internalUserId, db, jobId);
    if ("error" in result && result.error) return { done: true, error: result.error };
    return { done: true, assetId: result.assetId, imageUrl: result.imageUrl };
  }

  // Worker disparado — polling do banco por até 55s
  const deadline = Date.now() + 55_000;
  const pollInterval = 2_000;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollInterval));

    const { data: job } = await db
      .from("frameagent_jobs")
      .select("status, output_url, error_message")
      .eq("id", jobId)
      .single();

    if (!job) break;

    if (job.status === "done") {
      // Buscar asset gerado
      const { data: asset } = await db
        .from("frameagent_assets")
        .select("id")
        .eq("job_id", jobId)
        .single();
      return { done: true, assetId: asset?.id ?? null, imageUrl: job.output_url };
    }

    if (job.status === "failed") {
      return { done: true, error: job.error_message ?? "Geração falhou" };
    }
    // status === "processing" → continua polling
  }

  // Timeout — job ainda em processing; retorna job_id para o frontend fazer polling
  return { done: false };
}

// ── POST /api/jobs ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { prompt, type = "image", model = "flux-schnell" } = body;

  if (!prompt?.trim())
    return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 });
  if (prompt.length > 2000)
    return NextResponse.json({ error: "Prompt máximo 2000 caracteres" }, { status: 400 });
  if (!FAL_MODELS[model])
    return NextResponse.json({ error: `Modelo inválido: ${model}` }, { status: 400 });

  const db   = supabaseAdmin();
  const user = await getUserInternalId(db, clerkId);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado. Faça login novamente." }, { status: 404 });
  if (user.credits < 5) return NextResponse.json({ error: "Créditos insuficientes. Recarregue sua conta.", code: "NO_CREDITS" }, { status: 402 });

  // Verificar key antes de criar job
  const falKey = await getFalApiKey(db, user.id);
  if (!falKey) {
    return NextResponse.json({
      error: "Nenhuma API key fal.ai configurada. Adicione em Dashboard → API Keys.",
      code: "NO_FAL_KEY",
    }, { status: 422 });
  }

  // Criar job como 'processing' imediatamente
  const modelConfig = FAL_MODELS[model]!;
  const dims = TYPE_DIMENSIONS[type] ?? TYPE_DIMENSIONS["image"];
  const dbType = TYPE_DB_MAP[type] ?? "image_generation";

  const { data: job, error: jobErr } = await db
    .from("frameagent_jobs")
    .insert({
      user_id:      user.id,
      type:         dbType,
      status:       "processing",
      prompt:       prompt.trim(),
      model:        modelConfig.falId,
      provider:     "fal.ai",
      credits_used: 5,
      metadata: { dimensions: dims, model_name: modelConfig.name },
    })
    .select("id")
    .single();

  if (jobErr || !job)
    return NextResponse.json({ error: jobErr?.message ?? "Erro ao criar job" }, { status: 500 });

  // Disparar worker + aguardar até 55s
  const outcome = await dispatchAndWait(
    job.id, clerkId, prompt.trim(), type, model, db, user.id,
  );

  if (!outcome.done) {
    // Timeout — retorna job_id para frontend fazer polling
    return NextResponse.json({
      job_id:   job.id,
      asset_id: null,
      status:   "processing",
      polling:  true,
      message:  "Geração em andamento. Acompanhe em Jobs.",
    }, { status: 202 });
  }

  if (outcome.error) {
    return NextResponse.json({
      error:  outcome.error,
      job_id: job.id,
    }, { status: 500 });
  }

  return NextResponse.json({
    job_id:    job.id,
    asset_id:  outcome.assetId ?? null,
    image_url: outcome.imageUrl,
    status:    "done",
  }, { status: 201 });
}

// ── PATCH /api/jobs — Retry job failed ────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId obrigatório" }, { status: 400 });

  const db   = supabaseAdmin();
  const user = await getUserInternalId(db, clerkId);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Buscar job original
  const { data: originalJob } = await db
    .from("frameagent_jobs")
    .select("prompt, model, type, user_id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!originalJob) return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  if (originalJob.status !== "failed")
    return NextResponse.json({ error: "Só é possível retentar jobs com status 'failed'" }, { status: 400 });
  if (user.credits < 5)
    return NextResponse.json({ error: "Créditos insuficientes", code: "NO_CREDITS" }, { status: 402 });

  // Recuperar tipo original (reverter TYPE_DB_MAP)
  const typeReverse: Record<string, string> = {
    "image_generation": "image",
    "reel_compose":     "reel",
  };
  const frontendType = typeReverse[originalJob.type] ?? "image";

  // Encontrar model key pelo falId
  const modelKey = Object.entries(FAL_MODELS).find(([, v]) => v.falId === originalJob.model)?.[0] ?? "flux-schnell";

  const result = await generateImage(originalJob.prompt, frontendType, modelKey, user.id, db);

  if ("error" in result && result.error)
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
  const user = await getUserInternalId(db, clerkId);
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
