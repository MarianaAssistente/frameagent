/**
 * GET /api/v1/assets — Lista assets via API token (para agentes)
 * Query: type, source, limit
 */

import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

async function getApiUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const db = supabaseAdmin()
  const { data } = await db
    .from('frameagent_api_tokens')
    .select('user_id')
    .eq('token', token)
    .eq('active', true)
    .single()
  return data?.user_id || null
}

export async function GET(req: Request) {
  const userId = await getApiUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const source = url.searchParams.get('source')
  const limit = parseInt(url.searchParams.get('limit') || '50')

  let query = db
    .from('frameagent_assets')
    .select('id, name, title, type, url, source, mime_type, width, height, tags, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type) query = (query as any).eq('type', type)
  if (source) query = (query as any).eq('source', source)

  const { data } = await query
  return NextResponse.json({ assets: data || [], count: (data || []).length })
}
