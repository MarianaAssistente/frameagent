export const maxDuration = 10;
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { job_id, image_url, error } = await req.json().catch(() => ({}));
  if (!job_id) return NextResponse.json({ error: "job_id obrigatório" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: user } = await db.from("frameagent_users").select("id,credits").eq("clerk_user_id", clerkId).single();
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (error || !image_url) {
    await db.from("frameagent_jobs").update({ status:"failed", error_message: error??"Sem URL", completed_at: new Date().toISOString() }).eq("id", job_id);
    return NextResponse.json({ ok: true, status: "failed" });
  }
  const { data: job } = await db.from("frameagent_jobs").select("metadata,prompt,model").eq("id", job_id).single();
  const dims = (job?.metadata as any)?.dimensions ?? { w:1024, h:1024 };
  const { data: asset } = await db.from("frameagent_assets").insert({ user_id: user.id, job_id, type:"image", url: image_url, filename:`image_${job_id.slice(0,8)}.jpg`, mime_type:"image/jpeg", width: dims.w??dims.width??1024, height: dims.h??dims.height??1024, metadata:{prompt:job?.prompt,model:job?.model,provider:"fal.ai"} }).select("id").single();
  await db.from("frameagent_jobs").update({ status:"done", output_url: image_url, completed_at: new Date().toISOString() }).eq("id", job_id);
  await db.from("frameagent_users").update({ credits: Math.max(0, user.credits - 5) }).eq("id", user.id);
  return NextResponse.json({ ok: true, asset_id: asset?.id, image_url, status: "done" });
}
