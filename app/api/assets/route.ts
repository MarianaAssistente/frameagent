/**
 * GET /api/assets — Lista assets do usuário
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getUserInternalId(db: ReturnType<typeof supabaseAdmin>, clerkId: string): Promise<string | null> {
  const { data } = await db
    .from("frameagent_users")
    .select("id")
    .eq("clerk_user_id", clerkId)
    .single();
  return data?.id ?? null;
}

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const internalUserId = await getUserInternalId(db, clerkId);
  if (!internalUserId) return NextResponse.json({ assets: [] });

  const { data: assets, error } = await db
    .from("frameagent_assets")
    .select("id, type, url, filename, width, height, mime_type, created_at, metadata")
    .eq("user_id", internalUserId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ assets: assets ?? [] });
}
