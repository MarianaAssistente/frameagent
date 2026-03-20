import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider, bucket_name, access_key, secret_key, endpoint_url, region } = await req.json()

  if (!bucket_name || !access_key || !secret_key) {
    return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 })
  }

  try {
    if (provider === 'r2' || provider === 's3') {
      const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3')

      const client = new S3Client({
        region: region || 'auto',
        endpoint: endpoint_url || undefined,
        credentials: { accessKeyId: access_key, secretAccessKey: secret_key },
        forcePathStyle: provider === 'r2',
      })

      const testKey = `_frameagent_test_${Date.now()}.txt`

      await client.send(new PutObjectCommand({
        Bucket: bucket_name,
        Key: testKey,
        Body: 'FrameAgent connection test',
        ContentType: 'text/plain',
      }))

      await client.send(new DeleteObjectCommand({ Bucket: bucket_name, Key: testKey }))

      // Mark as verified in DB
      const { supabaseAdmin } = await import('@/lib/supabase')
      const db = supabaseAdmin()
      const { data: user } = await db.from('frameagent_users').select('id').eq('clerk_user_id', clerkId).single()
      if (user) {
        await db.from('frameagent_storage_configs')
          .update({ verified: true, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
      }

      return NextResponse.json({ message: '✅ Conexão bem-sucedida! Bucket verificado.' })
    }

    return NextResponse.json({ error: 'Provider não suportado ainda' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Falha na conexão'
    return NextResponse.json({ error: `❌ Falha: ${msg}` }, { status: 400 })
  }
}
