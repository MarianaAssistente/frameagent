/**
 * POST /api/v1/edit
 * Authorization: Bearer <token>
 * Body: { operation, asset_id?, image_url?, prompt, params? }
 *
 * Example:
 * curl -X POST https://frameagent.ai/api/v1/edit \
 *   -H "Authorization: Bearer TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"operation":"remove-bg","image_url":"https://..."}'
 */

import { supabaseAdmin } from '@/lib/supabase'
import { processEdit } from '@/lib/edit-engine'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  const result = await processEdit(tokenRow.user_id, body)

  if ('error' in result) {
    return NextResponse.json(
      { error: result.error, ...(result.detail ? { detail: result.detail } : {}), ...(result.credits_required ? { credits_required: result.credits_required } : {}) },
      { status: result.status as number }
    )
  }

  return NextResponse.json(result.data, { status: 200 })
}
