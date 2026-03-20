import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

interface Segment {
  index: number
  start: number
  end: number
  narration: string
  broll_url: string
  broll_duration: number
}

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
  const { audio_url, segments, aspect_ratio = '9:16', title = 'Video' } = body as {
    audio_url: string
    segments: Segment[]
    aspect_ratio: string
    title: string
  }

  if (!audio_url || !segments?.length) {
    return NextResponse.json({ error: 'audio_url and segments are required' }, { status: 400 })
  }

  const COST = 10
  if (user.credits < COST) return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })

  const creatomateKey = process.env.CREATOMATE_API_KEY!

  const dimensions: Record<string, { width: number; height: number }> = {
    '9:16': { width: 1080, height: 1920 },
    '1:1':  { width: 1080, height: 1080 },
    '16:9': { width: 1920, height: 1080 },
  }
  const { width, height } = dimensions[aspect_ratio] || dimensions['9:16']

  const elements: unknown[] = [
    {
      type: 'audio',
      source: audio_url,
      time: 0,
      fit: 'none',
    }
  ]

  let currentTime = 0
  for (const seg of segments) {
    if (!seg.broll_url) continue
    elements.push({
      type: 'video',
      source: seg.broll_url,
      time: seg.start,
      duration: seg.broll_duration || (seg.end - seg.start),
      fit: 'cover',
      trim_start: 0,
    })
    currentTime = Math.max(currentTime, seg.end)
  }

  const creatomateBody = {
    output_format: 'mp4',
    width,
    height,
    duration: currentTime,
    elements,
    frame_rate: 30,
  }

  try {
    const ctRes = await fetch('https://api.creatomate.com/v1/renders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creatomateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([creatomateBody]),
    })

    const ctData = await ctRes.json() as Array<{ id: string; status: string; url?: string }>

    if (!ctRes.ok) {
      return NextResponse.json({ error: 'Creatomate render failed', detail: ctData }, { status: 500 })
    }

    const renderId = ctData[0]?.id

    let videoUrl = ''
    for (let i = 0; i < 36; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const pollRes = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
        headers: { 'Authorization': `Bearer ${creatomateKey}` }
      })
      const pollData = await pollRes.json() as { status: string; url?: string }
      if (pollData.status === 'succeeded' && pollData.url) {
        videoUrl = pollData.url
        break
      }
      if (pollData.status === 'failed') break
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'Render timed out or failed', render_id: renderId }, { status: 500 })
    }

    await db.from('frameagent_users').update({ credits: user.credits - COST }).eq('id', user.id)
    const { data: asset } = await db.from('frameagent_assets').insert({
      user_id: user.id,
      name: `composed-${Date.now()}.mp4`,
      title: title.slice(0, 60),
      type: 'video',
      url: videoUrl,
      mime_type: 'video/mp4',
      source: 'composed',
      tags: ['composed', aspect_ratio],
    }).select().single()

    return NextResponse.json({ url: videoUrl, asset_id: asset?.id, render_id: renderId })

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
