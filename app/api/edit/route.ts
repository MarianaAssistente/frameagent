/**
 * /api/edit — Editor de Imagem por Prompt
 * POST { operation, asset_id?, image_url?, prompt, params? }
 */

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { processEdit } from '@/lib/edit-engine'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const db = supabaseAdmin()

  // Support internal calls from /api/v1/edit via x-api-user-id header
  const internalUserId = req.headers.get('x-api-user-id')

  let userId: string

  if (internalUserId) {
    userId = internalUserId
  } else {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: user } = await db
      .from('frameagent_users')
      .select('id')
      .eq('clerk_user_id', clerkId)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    userId = user.id
  }

  const body = await req.json()
  const result = await processEdit(userId, body)

  if ('error' in result) {
    return NextResponse.json(
      { error: result.error, ...(result.detail ? { detail: result.detail } : {}), ...(result.credits_required ? { credits_required: result.credits_required } : {}) },
      { status: result.status as number }
    )
  }

  return NextResponse.json(result.data, { status: 200 })
}
