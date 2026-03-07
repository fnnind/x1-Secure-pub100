'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function signUp(
  email: string,
  password: string
): Promise<{ error?: string; requiresConfirmation?: boolean }> {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const emailRedirectTo = `${origin}/auth/callback?next=/`
  console.log('[signUp] signUp request', { email, emailRedirectTo })

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo },
  })

  if (error) {
    console.error('[signUp] signUp error', {
      email,
      message: error.message,
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
      name: error.name,
    })
    return { error: error.message }
  }

  if (data?.user?.identities?.length === 0) {
    console.warn('[signUp] email already registered', { email })
    return { error: 'An account with this email already exists. Sign in instead.' }
  }

  if (data?.user && !data?.session) {
    console.log('[signUp] confirmation email sent', {
      userId: data.user.id,
      email: data.user.email,
      confirmed: data.user.email_confirmed_at,
    })
    return { requiresConfirmation: true }
  }

  console.log('[signUp] signUp success (auto-confirmed)', {
    userId: data?.user?.id,
    email: data?.user?.email,
  })
  return {}
}
