import { createClient } from '@/lib/supabase/server'
import { safeRedirect } from '@/lib/utils/redirect'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirect(searchParams.get('next'))

  console.log('[auth/callback] received', { code: code ? `${code.slice(0, 8)}…` : null, next })

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      console.log('[auth/callback] exchangeCodeForSession success', {
        userId:   data.user?.id,
        email:    data.user?.email,
        confirmed: data.user?.email_confirmed_at,
        provider: data.user?.app_metadata?.provider,
      })
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] exchangeCodeForSession error', {
      message: error.message,
      status:  (error as { status?: number }).status,
      code:    (error as { code?: string }).code,
      name:    error.name,
    })
  } else {
    console.warn('[auth/callback] no code param in request')
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
