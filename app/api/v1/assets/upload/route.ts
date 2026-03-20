/**
 * POST /api/v1/assets/upload — Upload de mídia via API token (para agentes)
 * Suporta multipart/form-data (file) ou application/json (url)
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

export async function POST(req: Request) {
  const userId = await getApiUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') || ''
  const db = supabaseAdmin()

  let fileBuffer: ArrayBuffer
  let mimeType: string
  let originalFilename: string
  let title: string
  let tags: string[] = []

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    fileBuffer = await file.arrayBuffer()
    mimeType = file.type
    originalFilename = file.name
    title = (formData.get('title') as string) || file.name
    tags = ((formData.get('tags') as string) || '').split(',').filter(Boolean)
  } else if (contentType.includes('application/json')) {
    const body = await req.json()
    const { url, filename, type: bodyType } = body
    title = body.title || filename || 'upload'
    tags = body.tags || []
    if (!url) return NextResponse.json({ error: 'No url or file' }, { status: 400 })
    const fetchRes = await fetch(url)
    fileBuffer = await fetchRes.arrayBuffer()
    mimeType = bodyType || fetchRes.headers.get('content-type') || 'image/jpeg'
    originalFilename = filename || url.split('/').pop() || 'file'
  } else {
    return NextResponse.json({ error: 'Unsupported content type. Use multipart/form-data or application/json' }, { status: 400 })
  }

  const isVideo = mimeType.startsWith('video/')
  const ext = originalFilename.split('.').pop() || (isVideo ? 'mp4' : 'jpg')
  const path = `${userId}/${Date.now()}.${ext}`

  const { error: uploadError } = await db.storage
    .from('frameagent-media')
    .upload(path, fileBuffer, { contentType: mimeType, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from('frameagent-media').getPublicUrl(path)

  const { data: asset, error } = await db.from('frameagent_assets').insert({
    user_id: userId,
    name: title,
    title,
    original_filename: originalFilename,
    type: isVideo ? 'video' : 'image',
    url: publicUrl,
    mime_type: mimeType,
    source: 'uploaded',
    tags: tags.length > 0 ? tags : null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    asset_id: asset.id,
    url: publicUrl,
    type: asset.type,
    name: asset.name,
  })
}
