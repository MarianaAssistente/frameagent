/**
 * /api/upload — Gera URL pré-assinada para upload direto (Supabase ou R2)
 * POST { filename, contentType }
 * Retorna { uploadUrl, publicUrl, method, headers? }
 * O browser faz o PUT/upload direto — sem passar pelo Vercel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
  "application/pdf",
];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType } = await req.json();

  if (!filename || !contentType)
    return NextResponse.json({ error: "filename e contentType são obrigatórios" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(contentType))
    return NextResponse.json({ error: `Tipo não permitido: ${contentType}` }, { status: 400 });

  const uuid = randomUUID();
  const ext = filename.split(".").pop() ?? "bin";
  const path = `uploads/${userId}/${uuid}.${ext}`;

  // Se R2 configurado, usa R2 presigned URL
  if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
    try {
      const { getPresignedUploadUrl, buildUploadKey } = await import("@/lib/r2");
      const key = buildUploadKey(userId, uuid, `${uuid}.${ext}`);
      const result = await getPresignedUploadUrl(key, contentType);
      return NextResponse.json({
        uploadUrl: result.uploadUrl,
        publicUrl: result.publicUrl,
        method: "PUT",
        path: key,
      });
    } catch (err: any) {
      // R2 falhou, continua para Supabase
    }
  }

  // Fallback: Supabase Storage presigned upload URL (upload direto do browser)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Garantir que o bucket existe
  const { error: bucketError } = await supabase.storage.createBucket("frameagent-uploads", {
    public: true,
    fileSizeLimit: 209715200, // 200MB
  });
  // ignora erro se bucket já existe

  // Gerar URL pré-assinada de upload (válida por 1h)
  const { data: signedData, error: signedError } = await supabase.storage
    .from("frameagent-uploads")
    .createSignedUploadUrl(path);

  if (signedError || !signedData) {
    return NextResponse.json({ error: signedError?.message || "Falha ao gerar URL de upload" }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from("frameagent-uploads")
    .getPublicUrl(path);

  return NextResponse.json({
    uploadUrl: signedData.signedUrl,
    token: signedData.token,
    publicUrl,
    method: "PUT",
    path,
    provider: "supabase",
  });
}
