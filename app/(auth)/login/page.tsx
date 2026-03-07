'use client'

import { createClient } from '@/lib/supabase/client'
import { safeRedirect } from '@/lib/utils/redirect'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get('redirectTo'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setIsLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setIsLoading(false)
    if (error) {
      console.error('[login] signInWithPassword error', {
        message: error.message,
        status:  (error as { status?: number }).status,
        code:    (error as { code?: string }).code,
        name:    error.name,
      })
      const detail = [
        error.message,
        (error as { code?: string }).code  ? `code: ${(error as { code?: string }).code}`   : null,
        (error as { status?: number }).status ? `status: ${(error as { status?: number }).status}` : null,
      ].filter(Boolean).join(' · ')
      setMessage({ type: 'error', text: detail })
      return
    }
    console.log('[login] signInWithPassword success', { userId: data.user?.id, email: data.user?.email })
    router.push(redirectTo)
    router.refresh()
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Enter your email' })
      return
    }
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
    })
    setIsLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setMessage({ type: 'success', text: 'Check your email for the sign-in link.' })
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form onSubmit={handleSignIn} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
          />
        </div>
        {message && (
          <p className={message.type === 'error' ? 'text-red-600 text-sm' : 'text-green-600 text-sm'}>
            {message.text}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? 'Signing in…' : 'Sign in with password'}
          </Button>
        </div>
      </form>
      <div className="relative">
        <span className="bg-white px-2 text-sm text-gray-500">or</span>
      </div>
      <form onSubmit={handleMagicLink} className="flex flex-col gap-2">
        <Button type="submit" variant="outline" disabled={isLoading}>
          Send magic link to email
        </Button>
      </form>
      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-red-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
