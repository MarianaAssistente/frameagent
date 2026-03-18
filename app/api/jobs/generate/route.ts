export const maxDuration = 10;
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptApiKey } from "@/lib/vault";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { prompt, type = "image", model = "flux-schnell" } = await req.json().catch(() => ({}));
  if (!prompt?.trim()) return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: user } = await db.from("frameagent_users").select("id,credits").eq("clerk_user_id", clerkId).single();
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (user.credits < 5) return NextResponse.json({ error: "Créditos insuficientes", code: "NO_CREDITS" }, { status: 402 });
  const { data: keyRow } = await db.from("frameagent_api_keys").select("key_encrypted").eq("user_id", user.id).eq("provider", "fal.ai").eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
  if (!keyRow) return NextResponse.json({ error: "Nenhuma API key fal.ai", code: "NO_FAL_KEY" }, { status: 422 });
  const falKey = decryptApiKey(keyRow.key_encrypted);
  const FAL_MODELS: Record<string,string> = { "flux-schnell": "fal-ai/flux/schnell", "flux-pro": "fal-ai/flux-pro", "flux-dev": "fal-ai/flux/dev" };
  const TYPE_DB: Record<string,string> = { image:"image_generation", post:"image_generation", reel:"reel_compose", story:"image_generation", avatar:"image_generation" };
  const DIMS: Record<string,{w:number,h:number}> = { image:{w:1024,h:1024}, reel:{w:1080,h:1920}, story:{w:1080,h:1920}, post:{w:1080,h:1350}, avatar:{w:512,h:512} };
  const dims = DIMS[type] ?? DIMS.image;
  const { data: job } = await db.from("frameagent_jobs").insert({ user_id: user.id, type: TYPE_DB[type]??"image_generation", status:"processing", prompt, model: FAL_MODELS[model]??"fal-ai/flux/schnell", provider:"fal.ai", credits_used:5, metadata:{dimensions:dims,model_name:model} }).select("id").single();
  return NextResponse.json({ job_id: job!.id, fal_key: falKey, fal_model: FAL_MODELS[model]??"fal-ai/flux/schnell", dimensions: dims });
}
// cache bust Wed Mar 18 21:56:55 UTC 2026
