/**
 * /api/video — Geração de vídeo
 * POST { mode, prompt, image_url?, asset_id?, duration?, aspect_ratio?, style? }
 *
 * Modes:
 *   text2video  — prompt de texto → vídeo (B-Roll)
 *   img2video   — imagem + prompt de movimento → vídeo
 */
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const VIDEO_MODELS = {
  text2video: {
    model: 'fal-ai/kling-video/v1.6/standard/text-to-video',
    credits: 20,
  },
  img2video: {
    model: 'fal-ai/kling-video/v1.6/standard/image-to-video',
    credits: 25,
  },
}

export async function POST(req: Request) {
  const db = supabaseAdmin()

  // Support x-api-user-id for agent API calls
  const internalUserId = req.headers.get('x-api-user-id')
  let user: { id: string; credits: number } | null = null

  if (internalUserId) {
    const { data } = await db
      .from('frameagent_users')
      .select('id, credits')
      .eq('id', internalUserId)
      .single()
    user = data
  } else {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data } = await db
      .from('frameagent_users')
      .select('id, credits')
      .eq('clerk_user_id', clerkId)
      .single()
    user = data
  }

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const {
    mode = 'text2video',
    prompt,
    image_url,
    asset_id,
    duration = '5',
    aspect_ratio = '9:16',
  } = body

  if (!VIDEO_MODELS[mode as keyof typeof VIDEO_MODELS]) {
    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 })
  }

  const { model, credits } = VIDEO_MODELS[mode as keyof typeof VIDEO_MODELS]

  if (user.credits < credits) {
    return NextResponse.json({ error: 'Insufficient credits', credits_required: credits }, { status: 402 })
  }

  if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  if (mode === 'img2video' && !image_url && !asset_id) {
    return NextResponse.json({ error: 'img2video requires image_url or asset_id' }, { status: 400 })
  }

  // Resolve image URL
  let inputImageUrl = image_url
  if (asset_id && !image_url) {
    const { data: asset } = await db
      .from('frameagent_assets')
      .select('url')
      .eq('id', asset_id)
      .eq('user_id', user.id)
      .single()
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    inputImageUrl = asset.url
  }

  // Get fal.ai key
  const { data: keyRow } = await db
    .from('frameagent_api_keys')
    .select('key_enc')
    .eq('user_id', user.id)
    .eq('provider', 'fal')
    .single()
  const { decryptApiKey } = await import('@/lib/vault')
  const falKey = keyRow ? await decryptApiKey(keyRow.key_enc) : process.env.FAL_API_KEY!

  const originalCredits = user.credits

  // Deduct credits
  await db.from('frameagent_users').update({ credits: user.credits - credits }).eq('id', user.id)

  // Register job
  const { data: job } = await db.from('frameagent_jobs').insert({
    user_id: user.id,
    type: 'video_generation',
    status: 'processing',
    operation: mode,
    prompt,
    parameters: { duration, aspect_ratio, model },
    credits_used: credits,
    model,
  }).select().single()

  if (!job) {
    await db.from('frameagent_users').update({ credits: originalCredits }).eq('id', user.id)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  try {
    type FalVideo = { url: string }

    // ── Enhance prompt via LLM (translate to English + add cinematic detail) ──
    let enhancedPrompt = prompt
    try {
      const llmKey = process.env.GEMINI_API_KEY
      if (llmKey) {
        const systemMsg = `You are a video prompt engineer. Convert the user's description into a detailed, cinematic English video prompt for an AI video generator.
Rules:
- Always write in English (translate if needed)
- Add specific visual details: camera angle, lighting, movement, atmosphere
- For 9:16 (vertical/portrait): emphasize VERTICAL composition, tall frame, portrait orientation
- For 1:1: emphasize square framing
- For 16:9: emphasize wide cinematic shot
- Be specific about locations (e.g. "New York City Manhattan skyline with Empire State Building")
- Max 150 words
- Return ONLY the enhanced prompt, no explanation`

        const llmBody = {
          model: 'google/gemini-flash-1.5',
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: `Aspect ratio: ${aspect_ratio}\nDescription: ${prompt}` }
          ],
          max_tokens: 200,
        }

        // Use Gemini directly (we always have GEMINI_API_KEY)
        const geminiKey = process.env.GEMINI_API_KEY
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `${systemMsg}\n\nAspect ratio: ${aspect_ratio}\nDescription: ${prompt}`
                }]
              }]
            }),
          }
        )
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json() as { candidates?: Array<{ content: { parts: Array<{ text: string }> } }> }
          const enhanced = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
          if (enhanced && enhanced.length > 10) enhancedPrompt = enhanced
        }
      }
    } catch { /* silently use original prompt */ }

    // ── Map aspect_ratio to Kling's expected format ──
    const klingAspectMap: Record<string, string> = {
      '9:16': '9:16',
      '1:1':  '1:1',
      '16:9': '16:9',
    }
    const klingAspect = klingAspectMap[aspect_ratio] || '9:16'

    let falInput: Record<string, unknown> = {}
    let falEndpoint = ''

    if (mode === 'text2video') {
      falEndpoint = 'https://fal.run/fal-ai/kling-video/v1.6/standard/text-to-video'
      falInput = {
        prompt: enhancedPrompt,
        duration: String(duration),
        aspect_ratio: klingAspect,
      }
    } else {
      falEndpoint = 'https://fal.run/fal-ai/kling-video/v1.6/standard/image-to-video'
      falInput = {
        image_url: inputImageUrl,
        prompt: enhancedPrompt,
        duration: String(duration),
      }
    }

    const falRes = await fetch(falEndpoint, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(falInput),
    })

    const falData = await falRes.json() as Record<string, unknown>

    let videoUrl: string =
      (falData as { video?: FalVideo })?.video?.url ||
      (falData as { videos?: FalVideo[] })?.videos?.[0]?.url ||
      (falData as { output_url?: string })?.output_url ||
      ''

    if (!videoUrl) {
      await db.from('frameagent_jobs').update({ status: 'failed', error: JSON.stringify(falData) }).eq('id', job.id)
      await db.from('frameagent_users').update({ credits: originalCredits }).eq('id', user.id)
      return NextResponse.json({ error: 'Video generation failed', detail: falData }, { status: 500 })
    }

    // Save asset
    const { data: asset } = await db.from('frameagent_assets').insert({
      user_id: user.id,
      name: `${mode === 'text2video' ? 'broll' : 'img2video'}-${Date.now()}.mp4`,
      title: prompt.slice(0, 60),
      type: 'video',
      url: videoUrl,
      mime_type: 'video/mp4',
      source: mode === 'text2video' ? 'broll' : 'generated',
      tags: [mode, aspect_ratio],
      job_id: job.id,
      aspect_ratio,
    }).select().single()

    await db.from('frameagent_jobs').update({
      status: 'completed',
      output_url: videoUrl,
      output_asset_id: asset?.id,
    }).eq('id', job.id)

    return NextResponse.json({ job_id: job.id, mode, url: videoUrl, asset_id: asset?.id })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await db.from('frameagent_jobs').update({ status: 'failed', error: msg }).eq('id', job.id)
    await db.from('frameagent_users').update({ credits: originalCredits }).eq('id', user.id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
