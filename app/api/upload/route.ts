/**
 * /api/upload — Gera URL pre-assinada para upload direto ao R2
 * POST { filename, contentType, context: "input" | "asset" }
 * Retorna { uploadUrl, key, publicUrl }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPresignedUploadUrl, buildUploadKey } from "@/lib/r2";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
  "audio/mpeg", "audio/wav", "audio/ogg",
  "application/pdf",
];

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType } = await req.json();

  if (!filename || !contentType)
    return NextResponse.json({ error: "filename e contentType são obrigatórios" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(contentType))
    return NextResponse.json({ error: `Tipo não permitido: ${contentType}` }, { status: 400 });

  const uuid = randomUUID();
  const ext  = filename.split(".").pop() ?? "bin";
  const safeFilename = `${uuid}.${ext}`;
  const key  = buildUploadKey(userId, uuid, safeFilename);

  try {
    const result = await getPresignedUploadUrl(key, contentType, MAX_SIZE);
    return NextResponse.json({ ...result, uuid });
  } catch (err: any) {
    // R2 não configurado — retorna mock para dev
    if (process.env.NODE_ENV === "development" || !process.env.R2_ACCOUNT_ID) {
      return NextResponse.json({
        uploadUrl: `https://r2.mock/upload/${key}`,
        key,
        publicUrl: `https://assets.frameagent.dev/${key}`,
        uuid,
        _mock: true,
      });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
