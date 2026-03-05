import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateId } from '@/lib/utils/id'
import { checkRateLimit } from '@/lib/utils/rateLimit'

const VALID_TYPES = new Set(['subxeuron', 'publication', 'event', 'post'])

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  try {
    const { entityType, entityId } = await req.json()

    if (!VALID_TYPES.has(entityType) || !entityId || typeof entityId !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // 60 page-view inserts per IP per 60 s (bots / scrapers)
    const ip = getClientIp(req)
    const allowed = await checkRateLimit(`track:${ip}`, 60, 60)
    if (!allowed) {
      return NextResponse.json({ ok: true }) // silent 200 — no need to signal to bots
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('page_view').insert({
      id: generateId(),
      entity_type: entityType,
      entity_id: entityId,
      viewer_id: user?.id ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 })
  }
}
