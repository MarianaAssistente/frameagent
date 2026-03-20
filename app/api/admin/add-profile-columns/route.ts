import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const db = supabaseAdmin()
  const results = []
  const queries = [
    `ALTER TABLE frameagent_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
    `ALTER TABLE frameagent_users ADD COLUMN IF NOT EXISTS display_name TEXT`,
  ]
  for (const q of queries) {
    try {
      const { error } = await db.rpc('exec_sql', { sql: q })
      results.push({ q, error: error?.message ?? null })
    } catch (e: any) {
      results.push({ q, error: e?.message ?? 'rpc not available' })
    }
  }
  return NextResponse.json({ results })
}
