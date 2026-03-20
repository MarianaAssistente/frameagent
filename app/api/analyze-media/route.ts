import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  const internalUserId = req.headers.get('x-api-user-id')

  const db = supabaseAdmin()
  let user: { id: string; credits: number } | null = null

  if (internalUserId) {
    const { data } = await db.from('frameagent_users').select('id, credits').eq('id', internalUserId).single()
    user = data
  } else {
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data } = await db.from('frameagent_users').select('id, credits').eq('clerk_user_id', clerkId).single()
    user = data
  }
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const { media_url, aspect_ratio = '9:16', style = 'cinematic', language = 'pt' } = body

  if (!media_url) return NextResponse.json({ error: 'media_url is required' }, { status: 400 })

  const COST = 5
  if (user.credits < COST) return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })

  const geminiKey = process.env.GEMINI_API_KEY!

  let geminiFileUri = ''
  try {
    const mediaRes = await fetch(media_url)
    if (!mediaRes.ok) return NextResponse.json({ error: `Falha ao baixar mídia: ${mediaRes.status}` }, { status: 500 })
    const mediaBuffer = await mediaRes.arrayBuffer()
    const mediaBytes = Buffer.from(mediaBuffer)

    // Detectar mime-type pela URL se o header não for confiável
    const urlPath = media_url.split('?')[0].toLowerCase()
    let mimeType = mediaRes.headers.get('content-type') || ''
    if (!mimeType || mimeType === 'application/octet-stream' || mimeType.includes('text/')) {
      if (urlPath.endsWith('.mp4') || urlPath.endsWith('.mov')) mimeType = 'video/mp4'
      else if (urlPath.endsWith('.mp3')) mimeType = 'audio/mpeg'
      else if (urlPath.endsWith('.wav')) mimeType = 'audio/wav'
      else if (urlPath.endsWith('.ogg')) mimeType = 'audio/ogg'
      else if (urlPath.endsWith('.webm')) mimeType = 'video/webm'
      else mimeType = 'audio/mpeg'
    }
    // Normalizar video/quicktime → video/mp4
    if (mimeType === 'video/quicktime') mimeType = 'video/mp4'

    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Command': 'start, upload, finalize',
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'X-Goog-Upload-Header-Content-Length': String(mediaBytes.length),
          'Content-Type': mimeType,
        },
        body: mediaBytes,
      }
    )
    const uploadData = await uploadRes.json() as { file?: { uri: string }; error?: { message: string } }
    if (uploadData?.error) return NextResponse.json({ error: `Gemini upload error: ${uploadData.error.message}` }, { status: 500 })
    geminiFileUri = uploadData?.file?.uri || ''
  } catch (e) {
    return NextResponse.json({ error: 'Falha ao enviar mídia ao Gemini', detail: String(e) }, { status: 500 })
  }

  if (!geminiFileUri) {
    return NextResponse.json({ error: 'Gemini não retornou URI do arquivo' }, { status: 500 })
  }

  const systemPrompt = `You are a professional video editor AI. Analyze this audio/video content and create a B-roll script.

Your task:
1. Transcribe the speech content
2. Divide it into segments of 3-8 seconds each
3. For each segment, suggest a B-roll clip that visually illustrates the narration
4. The B-roll prompts must be in English, detailed and cinematic
5. Format the output as valid JSON only

Aspect ratio: ${aspect_ratio}
Style: ${style}
Original language: ${language}

Return ONLY valid JSON, no markdown, no explanation:
{
  "transcript": "full transcription here",
  "duration_estimate": 30,
  "segments": [
    {
      "index": 0,
      "start": 0,
      "end": 5,
      "narration": "exact words spoken in this segment",
      "broll_prompt": "detailed English prompt for B-roll clip — include camera angle, lighting, movement, subject, atmosphere",
      "broll_duration": 5
    }
  ]
}`

  let analysisResult: {
    transcript: string
    duration_estimate: number
    segments: Array<{
      index: number
      start: number
      end: number
      narration: string
      broll_prompt: string
      broll_duration: number
    }>
  } | null = null

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { file_data: { file_uri: geminiFileUri } },
              { text: systemPrompt }
            ]
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
        })
      }
    )
    const geminiData = await geminiRes.json() as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>
    }
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      analysisResult = JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    return NextResponse.json({ error: 'Gemini analysis failed', detail: String(e) }, { status: 500 })
  }

  if (!analysisResult) {
    return NextResponse.json({ error: 'Failed to parse analysis result' }, { status: 500 })
  }

  await db.from('frameagent_users').update({ credits: user.credits - COST }).eq('id', user.id)

  return NextResponse.json({
    transcript: analysisResult.transcript,
    duration_estimate: analysisResult.duration_estimate,
    segments: analysisResult.segments,
    aspect_ratio,
    style,
    media_url,
  })
}
