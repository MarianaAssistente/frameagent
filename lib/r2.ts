/**
 * Cloudflare R2 Storage — FrameAgent
 * Compatível com S3 SDK (endpoint customizado)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID  = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET      = process.env.R2_BUCKET_NAME ?? "frameagent-assets";
const R2_PUBLIC_URL  = process.env.R2_PUBLIC_URL ?? "";   // https://assets.frameagent.com.br

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
  });
}

export interface UploadResult {
  key: string;       // e.g. "users/uid/assets/uuid.jpg"
  url: string;       // public URL or signed URL
  size: number;
  contentType: string;
}

/**
 * Upload de buffer direto para R2
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<UploadResult> {
  const r2 = getR2Client();

  await r2.send(new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         key,
    Body:        body,
    ContentType: contentType,
    Metadata:    metadata ?? {},
  }));

  const url = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL}/${key}`
    : await getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn: 86400 });

  return { key, url, size: body.length, contentType };
}

/**
 * Gera URL de upload pre-assinada (PUT) para upload direto do browser
 * Expira em 15 minutos
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  maxSizeBytes = 100 * 1024 * 1024, // 100 MB
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const r2 = getR2Client();

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         key,
      ContentType: contentType,
    }),
    { expiresIn: 900 }, // 15 min
  );

  const publicUrl = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL}/${key}`
    : await getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn: 86400 });

  return { uploadUrl, key, publicUrl };
}

/**
 * Gera URL de download pre-assinada (GET)
 */
export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const r2 = getR2Client();
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn });
}

/**
 * Deleta um objeto
 */
export async function deleteFromR2(key: string): Promise<void> {
  const r2 = getR2Client();
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

/**
 * Lista objetos de um prefix
 */
export async function listR2Objects(prefix: string): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
  const r2 = getR2Client();
  const resp = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix }));
  return (resp.Contents ?? []).map(obj => ({
    key:          obj.Key ?? "",
    size:         obj.Size ?? 0,
    lastModified: obj.LastModified ?? new Date(),
  }));
}

/**
 * Constrói key padronizada para assets de usuário
 * Pattern: users/{userId}/assets/{jobId}/{filename}
 */
export function buildAssetKey(userId: string, jobId: string, filename: string): string {
  return `users/${userId}/assets/${jobId}/${filename}`;
}

/**
 * Constrói key para uploads temporários (input do usuário)
 * Pattern: uploads/{userId}/tmp/{uuid}/{filename}
 */
export function buildUploadKey(userId: string, uuid: string, filename: string): string {
  return `uploads/${userId}/tmp/${uuid}/${filename}`;
}
