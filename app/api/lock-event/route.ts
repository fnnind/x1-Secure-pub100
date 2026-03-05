import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lockEventContent } from '@/action/lockEventContent'
import { safeRedirect } from '@/lib/utils/redirect'

export async function POST(request: Request) {
  try {
    // Explicit auth gate — reject unauthenticated requests before any logic
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const eventId = formData.get('eventId')?.toString()
    const target = formData.get('target')?.toString() as 'qa' | 'poll' | 'both' | null

    if (!eventId || !target || !['qa', 'poll', 'both'].includes(target)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    const result = await lockEventContent({ eventId, target })
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }

    // Safe same-origin redirect: extract only the path from the Referer header
    let redirectPath = '/'
    const referer = request.headers.get('referer')
    if (referer) {
      try {
        redirectPath = safeRedirect(new URL(referer).pathname)
      } catch { /* malformed referer — fall back to '/' */ }
    }
    return NextResponse.redirect(new URL(redirectPath, request.url))
  } catch {
    return NextResponse.json({ error: 'Failed to lock' }, { status: 500 })
  }
}
