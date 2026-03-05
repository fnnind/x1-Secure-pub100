'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Enter your email' })
      return
    }

    setIsLoading(true)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/callback?next=/update-password`,
    })
    setIsLoading(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    setMessage({
      type: 'success',
      text: 'Check your email for a link to reset your password. The link expires in 1 hour.',
    })
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="text-sm text-gray-600">
        Enter your email and we’ll send you a link to reset your password.
      </p>
      <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
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
        {message && (
          <p
            className={
              message.type === 'error' ? 'text-sm text-red-600' : 'text-sm text-green-600'
            }
          >
            {message.text}
          </p>
        )}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-red-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
