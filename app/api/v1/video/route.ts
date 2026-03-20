import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer '))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.slice(7)
  const db = supabaseAdmin()
  const { data: tokenRow } = await db
    .from('frameagent_api_tokens')
    .select('user_id')
    .eq('token', token)
    .eq('active', true)
    .single()

  if (!tokenRow) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await req.json()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frameagent.ai'
  const res = await fetch(`${baseUrl}/api/video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-user-id': tokenRow.user_id,
    },
    body: JSON.stringify(body),
  })

  return NextResponse.json(await res.json(), { status: res.status })
}
