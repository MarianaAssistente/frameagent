import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { encrypt } from '@/lib/storage'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const { data: user } = await db.from('frameagent_users').select('id').eq('clerk_user_id', clerkId).single()
  if (!user) return NextResponse.json(null)

  const { data } = await db
    .from('frameagent_storage_configs')
    .select('provider, bucket_name, region, endpoint_url, public_base_url, verified, active')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(data || null)
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const { data: user } = await db.from('frameagent_users').select('id, storage_plan').eq('clerk_user_id', clerkId).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.storage_plan !== 'scale') return NextResponse.json({ error: 'Plano SCALE necessário' }, { status: 403 })

  const body = await req.json()
  const { provider, bucket_name, region, access_key, secret_key, endpoint_url, public_base_url } = body

  const encAccessKey = encrypt(access_key)
  const encSecretKey = encrypt(secret_key)

  const { data, error } = await db
    .from('frameagent_storage_configs')
    .upsert({
      user_id: user.id,
      provider,
      bucket_name,
      region: region || 'auto',
      access_key_enc: encAccessKey,
      secret_key_enc: encSecretKey,
      endpoint_url: endpoint_url || null,
      public_base_url: public_base_url || null,
      active: true,
      verified: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('provider, bucket_name, region, endpoint_url, public_base_url, verified, active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
