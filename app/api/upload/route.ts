/**
 * /api/upload — Upload de arquivo via Supabase Storage (fallback quando R2 não configurado)
 * POST FormData: file
 * Retorna { url, key }
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

// Vercel limit is 4.5MB for serverless — we use chunked approach via Supabase
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentTypeHeader = req.headers.get("content-type") || "";

  // Mode 1: JSON → gerar presigned URL do R2 (se configurado)
  if (contentTypeHeader.includes("application/json")) {
    const { filename, contentType } = await req.json();

    if (!filename || !contentType)
      return NextResponse.json({ error: "filename e contentType são obrigatórios" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(contentType))
      return NextResponse.json({ error: `Tipo não permitido: ${contentType}` }, { status: 400 });

    // Se R2 configurado, gera presigned URL
    if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
      try {
        const { getPresignedUploadUrl, buildUploadKey } = await import("@/lib/r2");
        const uuid = randomUUID();
        const ext = filename.split(".").pop() ?? "bin";
        const key = buildUploadKey(userId, uuid, `${uuid}.${ext}`);
        const result = await getPresignedUploadUrl(key, contentType);
        return NextResponse.json({ ...result, uuid });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // R2 não configurado → instrui cliente a usar mode FormData direto
    return NextResponse.json({ useFormData: true });
  }

  // Mode 2: FormData → upload direto via Supabase Storage
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File;
  } catch {
    return NextResponse.json({ error: "Falha ao ler arquivo" }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Tipo não permitido: ${file.type}` }, { status: 400 });
  }

  const uuid = randomUUID();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `uploads/${userId}/${uuid}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("frameagent-uploads")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    // Bucket pode não existir — tentar criar
    if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("bucket")) {
      await supabase.storage.createBucket("frameagent-uploads", { public: true, fileSizeLimit: 209715200 });
      const { error: retryError } = await supabase.storage
        .from("frameagent-uploads")
        .upload(path, buffer, { contentType: file.type, upsert: false });
      if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
  }

  const { data: { publicUrl } } = supabase.storage
    .from("frameagent-uploads")
    .getPublicUrl(path);

  return NextResponse.json({ url: publicUrl, key: path });
}
