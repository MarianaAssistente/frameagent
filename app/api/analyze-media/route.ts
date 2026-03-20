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

  // Baixar mídia e enviar como base64 inline (sem Files API — funciona no plano gratuito)
  let mediaBase64 = ''
  let mimeType = 'audio/mpeg'
  try {
    const mediaRes = await fetch(media_url)
    if (!mediaRes.ok) return NextResponse.json({ error: `Falha ao baixar mídia: ${mediaRes.status}` }, { status: 500 })
    const mediaBuffer = await mediaRes.arrayBuffer()
    const mediaBytes = Buffer.from(mediaBuffer)

    // Detectar mime-type pela URL se o header não for confiável
    const urlPath = media_url.split('?')[0].toLowerCase()
    mimeType = mediaRes.headers.get('content-type') || ''
    if (!mimeType || mimeType === 'application/octet-stream' || mimeType.includes('text/')) {
      if (urlPath.endsWith('.mp4') || urlPath.endsWith('.mov')) mimeType = 'video/mp4'
      else if (urlPath.endsWith('.mp3')) mimeType = 'audio/mpeg'
      else if (urlPath.endsWith('.wav')) mimeType = 'audio/wav'
      else if (urlPath.endsWith('.ogg')) mimeType = 'audio/ogg'
      else if (urlPath.endsWith('.webm')) mimeType = 'video/webm'
      else mimeType = 'audio/mpeg'
    }
    if (mimeType === 'video/quicktime') mimeType = 'video/mp4'

    mediaBase64 = mediaBytes.toString('base64')
  } catch (e) {
    return NextResponse.json({ error: 'Falha ao baixar mídia', detail: String(e) }, { status: 500 })
  }

  const systemPrompt = `You are a professional video editor AI. Analyze this audio/video and create a B-roll script.

IMPORTANT: Respond with ONLY raw JSON. No markdown, no backticks, no explanation. Start your response with { and end with }.

Tasks:
1. Transcribe ALL speech
2. Split into segments of 3-8 seconds
3. For each segment write a detailed English B-roll prompt

Aspect ratio: ${aspect_ratio} | Style: ${style}

Required JSON structure (respond ONLY with this, nothing else):
{"transcript":"full text here","duration_estimate":30,"segments":[{"index":0,"start":0,"end":5,"narration":"words spoken","broll_prompt":"cinematic English prompt with camera angle lighting movement","broll_duration":5}]}`

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
              { inline_data: { mime_type: mimeType, data: mediaBase64 } },
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

    if (!rawText) {
      const reason = (geminiData?.candidates?.[0] as any)?.finishReason || 'unknown'
      return NextResponse.json({ error: `Gemini não retornou texto. Motivo: ${reason}` }, { status: 500 })
    }

    // Tentar extrair JSON de diferentes formatos de resposta
    let jsonStr = rawText.trim()
    // Remover markdown code blocks se existirem
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
    // Extrair o objeto JSON da resposta
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        analysisResult = JSON.parse(jsonMatch[0])
      } catch {
        // Tentar limpar e parsear novamente
        const cleaned = jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, ' ')
        analysisResult = JSON.parse(cleaned)
      }
    }
  } catch (e) {
    return NextResponse.json({ error: 'Gemini analysis failed', detail: String(e) }, { status: 500 })
  }

  if (!analysisResult || !analysisResult.segments?.length) {
    return NextResponse.json({ error: 'Não foi possível gerar o roteiro. Tente com um arquivo de áudio MP3 para melhor resultado.' }, { status: 500 })
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
