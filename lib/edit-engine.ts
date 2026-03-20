/**
 * edit-engine.ts — core logic for image editing operations
 * Used by both /api/edit (Clerk auth) and /api/v1/edit (Bearer token)
 */

import { supabaseAdmin } from '@/lib/supabase'
import { uploadToR2, buildAssetKey } from '@/lib/r2'
import { decryptApiKey } from '@/lib/vault'

/**
 * Upload image to fal.ai storage so it can be accessed by fal models.
 * Some URLs (Supabase, private buckets) can't be fetched directly by fal.ai.
 */
async function uploadImageToFal(imageUrl: string, falKey: string): Promise<string> {
  try {
    // fal.media URLs are already accessible by fal.ai — use directly
    if (imageUrl.includes('fal.media') || imageUrl.includes('fal.run')) {
      return imageUrl
    }

    // For other URLs (Supabase, R2, etc.) — download and re-upload to fal.ai storage
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return imageUrl
    const buffer = await imgRes.arrayBuffer()
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'

    const uploadRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_type: contentType, file_name: `input.${ext}` }),
    })
    if (!uploadRes.ok) return imageUrl

    const { upload_url, file_url } = await uploadRes.json()
    if (!upload_url || !file_url) return imageUrl

    const putRes = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: buffer,
    })
    if (!putRes.ok) return imageUrl

    return file_url
  } catch {
    return imageUrl
  }
}

export const OPERATIONS: Record<string, { falModel: string; credits: number }> = {
  'inpaint':   { falModel: 'fal-ai/flux/dev/image-to-image', credits: 8 },
  'restyle':   { falModel: 'fal-ai/flux/dev/image-to-image', credits: 8 },
  'remove-bg': { falModel: 'fal-ai/birefnet',                credits: 3 },
  'upscale':   { falModel: 'fal-ai/esrgan',                  credits: 5 },
  'outpaint':  { falModel: 'fal-ai/flux/dev/image-to-image', credits: 8 },
  'describe':  { falModel: 'fal-ai/florence-2-large',        credits: 2 },
}

interface EditBody {
  operation: string
  asset_id?: string
  image_url?: string
  prompt?: string
  params?: Record<string, unknown>
}

export async function processEdit(userId: string, body: EditBody) {
  const db = supabaseAdmin()
  const { operation, asset_id, image_url, prompt, params = {} } = body

  if (!OPERATIONS[operation]) {
    return { error: `Unknown operation: ${operation}`, status: 400 }
  }

  const { credits } = OPERATIONS[operation]

  const { data: user } = await db
    .from('frameagent_users')
    .select('id, credits')
    .eq('id', userId)
    .single()

  if (!user) return { error: 'User not found', status: 404 }

  if (user.credits < credits) {
    return { error: 'Insufficient credits', credits_required: credits, status: 402 }
  }

  // Resolve image URL
  let inputUrl = image_url
  const inputAssetId = asset_id
  if (asset_id && !image_url) {
    const { data: asset } = await db
      .from('frameagent_assets')
      .select('url')
      .eq('id', asset_id)
      .eq('user_id', user.id)
      .single()
    if (!asset) return { error: 'Asset not found', status: 404 }
    inputUrl = asset.url
  }

  if (!inputUrl) return { error: 'No image_url or asset_id provided', status: 400 }

  // Get fal.ai key
  const { data: keyRow } = await db
    .from('frameagent_api_keys')
    .select('key_enc')
    .eq('user_id', user.id)
    .eq('provider', 'fal')
    .single()

  const falKey = keyRow
    ? await decryptApiKey(keyRow.key_enc)
    : process.env.FAL_API_KEY!

  // Deduct credits
  await db.from('frameagent_users').update({ credits: user.credits - credits }).eq('id', user.id)

  // Register job
  const { data: job, error: jobError } = await db.from('frameagent_jobs').insert({
    user_id: user.id,
    type: 'image_edit',
    status: 'processing',
    operation,
    input_asset_id: inputAssetId || null,
    prompt: prompt || null,
    parameters: params || {},
    edit_params: params || {},
    credits_used: credits,
    model: OPERATIONS[operation].falModel,
  }).select().single()

  if (jobError) console.error('Job insert error:', jobError)

  if (!job) return { error: 'Failed to create job', status: 500 }

  try {
    type FalImage = { url: string }
    let falResult: Record<string, unknown> = {}

    // Upload image to fal.ai storage to ensure it's accessible
    const falInputUrl = await uploadImageToFal(inputUrl!, falKey)

    if (operation === 'remove-bg') {
      const res = await fetch(`https://fal.run/fal-ai/birefnet`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: falInputUrl }),
      })
      falResult = await res.json() as Record<string, unknown>

    } else if (operation === 'upscale') {
      const res = await fetch(`https://fal.run/fal-ai/esrgan`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: falInputUrl, scale: (params.scale as number) || 4 }),
      })
      falResult = await res.json() as Record<string, unknown>

    } else if (operation === 'describe') {
      const res = await fetch(`https://fal.run/fal-ai/florence-2-large`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: falInputUrl, task: '<DETAILED_CAPTION>' }),
      })
      falResult = await res.json() as Record<string, unknown>
      const caption = (falResult as { results?: { '<DETAILED_CAPTION>'?: string } })?.results?.['<DETAILED_CAPTION>'] || ''
      await db.from('frameagent_jobs').update({ status: 'completed', output_url: caption }).eq('id', job.id)
      return { data: { job_id: job.id, operation, description: caption }, status: 200 }

    } else if (operation === 'restyle') {
      // Use low strength to preserve subject/composition — only style changes
      // Prefix prompt with preservation instructions
      const stylePrompt = `same subject, same pose, same composition, same character, only art style changed to: ${prompt || 'high quality digital art'}. Keep all anatomical features identical.`
      const res = await fetch(`https://fal.run/fal-ai/flux/dev/image-to-image`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: falInputUrl,
          prompt: stylePrompt,
          strength: (params.strength as number) || 0.45,  // low = preserves subject
          num_inference_steps: 28,
          guidance_scale: 3.5,
        }),
      })
      falResult = await res.json() as Record<string, unknown>

    } else if (operation === 'inpaint') {
      const res = await fetch(`https://fal.run/fal-ai/flux/dev/image-to-image`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: falInputUrl,
          prompt: prompt || '',
          mask_url: params.mask_url || null,
          strength: (params.strength as number) || 0.95,
          num_inference_steps: 28,
        }),
      })
      falResult = await res.json() as Record<string, unknown>

    } else if (operation === 'outpaint') {
      const res = await fetch(`https://fal.run/fal-ai/flux/dev/image-to-image`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: falInputUrl,
          prompt: prompt || 'seamlessly extend the image',
          strength: 0.85,
          num_inference_steps: 28,
        }),
      })
      falResult = await res.json() as Record<string, unknown>
    }

    const outputUrl: string =
      (falResult as { image?: FalImage })?.image?.url ||
      (falResult as { images?: FalImage[] })?.images?.[0]?.url ||
      (falResult as { output_url?: string })?.output_url ||
      ''

    if (!outputUrl) {
      await db.from('frameagent_jobs').update({ status: 'failed', error: JSON.stringify(falResult) }).eq('id', job.id)
      await db.from('frameagent_users').update({ credits: user.credits }).eq('id', user.id)
      return { error: 'fal.ai returned no image', detail: falResult, status: 500 }
    }

    // Save directly using fal.media URL (skip R2 upload — credentials not required)
    const ext = operation === 'remove-bg' ? 'png' : 'jpg'
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg'

    const { data: outputAsset } = await db.from('frameagent_assets').insert({
      user_id: user.id,
      name: `${operation}-${Date.now()}.${ext}`,
      title: `${operation} result`,
      type: 'image',
      url: outputUrl,
      mime_type: mime,
      source: 'generated',
      tags: [operation],
      job_id: job.id,
    }).select().single()

    await db.from('frameagent_jobs').update({
      status: 'completed',
      output_url: outputUrl,
      output_asset_id: outputAsset?.id,
    }).eq('id', job.id)

    return {
      data: {
        job_id: job.id,
        operation,
        url: outputUrl,
        asset_id: outputAsset?.id,
      },
      status: 200,
    }

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await db.from('frameagent_jobs').update({ status: 'failed', error: msg }).eq('id', job.id)
    await db.from('frameagent_users').update({ credits: user.credits }).eq('id', user.id)
    return { error: msg, status: 500 }
  }
}
