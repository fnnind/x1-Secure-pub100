'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createClient } from './client'
import type { UserResult } from './user'

type AuthContextValue = {
  user: UserResult | null
  isLoading: boolean
  isSignedIn: boolean
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      setUser(null)
      return
    }
    const { data: profile } = await supabase
      .from('user')
      .select('id, username, email, image_url')
      .eq('id', authUser.id)
      .single()
    if (profile) {
      setUser({
        _id: profile.id,
        username: profile.username ?? '',
        imageUrl: profile.image_url ?? '',
        email: profile.email ?? '',
      })
    } else {
      setUser(null)
    }
  }, [supabase])

  useEffect(() => {
    fetchProfile().finally(() => setIsLoading(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchProfile()
    })
    return () => subscription.unsubscribe()
  }, [fetchProfile, supabase.auth])

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isSignedIn: !!user, refetch: fetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useUser must be used within AuthProvider')
  return ctx
}
