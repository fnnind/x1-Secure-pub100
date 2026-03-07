'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[signIn] signInWithPassword error', {
      email,
      message: error.message,
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
      name: error.name,
    })
    const detail = [
      error.message,
      (error as { code?: string }).code ? `code: ${(error as { code?: string }).code}` : null,
      (error as { status?: number }).status
        ? `status: ${(error as { status?: number }).status}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ')
    return { error: detail }
  }

  console.log('[signIn] signInWithPassword success', {
    userId: data.user?.id,
    email: data.user?.email,
    confirmed: data.user?.email_confirmed_at,
    provider: data.user?.app_metadata?.provider,
  })
  return {}
}

export async function sendMagicLink(
  email: string,
  redirectTo: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
  console.log('[signIn] sendMagicLink request', { email, emailRedirectTo })

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo },
  })

  if (error) {
    console.error('[signIn] sendMagicLink error', {
      email,
      message: error.message,
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
    })
    return { error: error.message }
  }

  console.log('[signIn] sendMagicLink sent', { email })
  return {}
}
