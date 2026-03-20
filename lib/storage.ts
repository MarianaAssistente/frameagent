import { supabaseAdmin } from './supabase'
import { encryptApiKey, decryptApiKey } from './vault'

interface StorageConfig {
  provider: 'supabase' | 's3' | 'r2' | 'gcs'
  bucketName?: string
  region?: string
  accessKey?: string
  secretKey?: string
  endpointUrl?: string
  publicBaseUrl?: string
}

interface UploadResult {
  url: string
  path: string
  provider: string
  size: number
}

// Limites por arquivo por plano
// FREE e PRO usam R2 da STM Group (storage gerenciado)
// SCALE pode usar BYOK bucket próprio (ilimitado, responsabilidade do usuário)
export const PLAN_LIMITS = {
  free:  200 * 1024 * 1024,  // 200MB por arquivo
  pro:   2   * 1024 * 1024 * 1024, // 2GB por arquivo
  scale: Infinity,            // ilimitado (R2 STM ou BYOK)
}

export async function getUserStorageConfig(userId: string): Promise<StorageConfig> {
  const db = supabaseAdmin()

  const { data: user } = await db
    .from('frameagent_users')
    .select('storage_plan, byok_storage')
    .eq('id', userId)
    .single()

  // SCALE + BYOK configurado → usar bucket próprio do usuário
  if (user?.byok_storage && user?.storage_plan === 'scale') {
    const { data: config } = await db
      .from('frameagent_storage_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .eq('verified', true)
      .single()

    if (config) {
      return {
        provider: config.provider as 's3' | 'r2' | 'gcs',
        bucketName: config.bucket_name,
        region: config.region,
        accessKey: decryptApiKey(config.access_key_enc),
        secretKey: decryptApiKey(config.secret_key_enc),
        endpointUrl: config.endpoint_url,
        publicBaseUrl: config.public_base_url,
      }
    }
  }

  // Default: R2 da STM Group (barato, sem egress, ilimitado)
  return { provider: 'r2' }
}

export async function uploadFile(
  buffer: ArrayBuffer,
  filename: string,
  mimeType: string,
  userId: string,
  config: StorageConfig
): Promise<UploadResult> {
  const ext = filename.split('.').pop() || 'bin'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const size = buffer.byteLength

  if (config.provider === 'supabase') {
    const db = supabaseAdmin()
    const { error } = await db.storage
      .from('frameagent-media')
      .upload(path, buffer, { contentType: mimeType, upsert: false })

    if (error) throw new Error(error.message)

    const { data: { publicUrl } } = db.storage
      .from('frameagent-media')
      .getPublicUrl(path)

    return { url: publicUrl, path, provider: 'supabase', size }
  }

  if (config.provider === 'r2' || config.provider === 's3') {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

    const client = new S3Client({
      region: config.region || 'auto',
      endpoint: config.endpointUrl,
      credentials: {
        accessKeyId: config.accessKey!,
        secretAccessKey: config.secretKey!,
      },
      forcePathStyle: config.provider === 'r2',
    })

    await client.send(new PutObjectCommand({
      Bucket: config.bucketName!,
      Key: path,
      Body: Buffer.from(buffer),
      ContentType: mimeType,
    }))

    const baseUrl = config.publicBaseUrl?.replace(/\/$/, '') ||
      `https://${config.bucketName}.s3.${config.region}.amazonaws.com`
    const url = `${baseUrl}/${path}`

    return { url, path, provider: config.provider, size }
  }

  throw new Error(`Provider ${config.provider} not supported yet`)
}

export function getFileSizeLimit(plan: string): number {
  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free
}

// Re-export encrypt/decrypt wrappers for settings APIs
export function encrypt(plaintext: string): string {
  return encryptApiKey(plaintext)
}

export function decrypt(encrypted: string): string {
  return decryptApiKey(encrypted)
}
