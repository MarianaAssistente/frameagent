import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const secret = req.headers.get('x-migrate-secret')
  if (secret !== 'fra-migrate-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const results: Record<string, string> = {}

  // Use raw SQL via Postgres connection through Supabase's sql method
  // Supabase JS v2 doesn't expose raw SQL, so we use a workaround:
  // Insert a dummy record to trigger column check, or use the REST schema endpoint
  
  // Actually use the direct SQL via supabase-js using the .from() workaround
  // We'll try to select the columns — if they don't exist, we know we need to add them
  
  const { error: checkError } = await db
    .from('frameagent_users')
    .select('avatar_url, display_name')
    .limit(1)

  if (!checkError) {
    return NextResponse.json({ message: 'Columns already exist', avatar_url: 'ok', display_name: 'ok' })
  }

  // Columns don't exist — use the Supabase Management API with service role
  // The only way is via pg connection string or management API with PAT
  // Let's try the pg REST endpoint
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('https://', '')
  const ref = url.split('.')[0]
  
  const managementRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        ALTER TABLE frameagent_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE frameagent_users ADD COLUMN IF NOT EXISTS display_name TEXT;
      `
    })
  })

  const managementData = await managementRes.json()
  results.management_api = managementRes.ok ? 'ok' : JSON.stringify(managementData)

  return NextResponse.json(results)
}
