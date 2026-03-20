import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const { data } = await db
    .from('frameagent_users')
    .select('credits, plan, display_name, avatar_url')
    .eq('clerk_user_id', userId)
    .single()

  return NextResponse.json(data ?? {})
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { display_name, avatar_url } = body

  const db = supabaseAdmin()
  await db
    .from('frameagent_users')
    .update({ display_name, avatar_url })
    .eq('clerk_user_id', userId)

  return NextResponse.json({ success: true })
}
