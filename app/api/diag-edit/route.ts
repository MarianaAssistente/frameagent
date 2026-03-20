import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (secret !== 'diag-edit-2026') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const FAL_KEY = process.env.FAL_API_KEY || ''
  const imageUrl = url.searchParams.get('image') || 'https://v3b.fal.media/files/b/0a92d68a/PRDPH3UlkZOUdmN8jUB2u.jpg'

  const results: Record<string, unknown> = {
    fal_key_set: !!FAL_KEY,
    fal_key_prefix: FAL_KEY.slice(0, 12),
    image_url: imageUrl,
  }

  // Test birefnet directly
  try {
    const res = await fetch('https://fal.run/fal-ai/birefnet', {
      method: 'POST',
      headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl }),
    })
    const data = await res.json()
    results.birefnet_status = res.status
    results.birefnet_response = data
    results.birefnet_image_url = (data as { image?: { url?: string } })?.image?.url || null
  } catch (e) {
    results.birefnet_error = String(e)
  }

  return NextResponse.json(results)
}
