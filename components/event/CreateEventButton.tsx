'use client'

import Link from 'next/link'
import { useUser } from '@/lib/supabase/auth-context'
import { Plus } from 'lucide-react'

const triggerClassName =
  'w-full p-2 pl-5 flex items-center rounded-md cursor-pointer bg-black text-white hover:bg-black transition-all duration-200 disabled:text-sm disabled:opacity-50 disabled:cursor-not-allowed'

export function CreateEventButton() {
  const { user } = useUser()

  if (!user) {
    return (
      <button
        type="button"
        disabled
        className={triggerClassName}
      >
        <Plus className="mr-2 h-4 w-4 shrink-0" />
        Sign in to create event
      </button>
    )
  }

  return (
    <Link href="/events/create" className={triggerClassName}>
      <Plus className="mr-2 h-4 w-4 shrink-0" />
      Create new Event
    </Link>
  )
}
