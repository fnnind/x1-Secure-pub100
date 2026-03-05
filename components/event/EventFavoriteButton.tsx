'use client'

import { useTransition } from 'react'
import { Star } from 'lucide-react'
import { toggleEventFavorite } from '@/action/toggleEventFavorite'
import { useRouter } from 'next/navigation'

interface Props {
  eventId: string
  initialFavorited: boolean
}

export function EventFavoriteButton({ eventId, initialFavorited }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      await toggleEventFavorite(eventId)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        initialFavorited
          ? 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
          : 'border-border bg-muted/50 hover:bg-muted'
      }`}
      title={initialFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star className={`h-3.5 w-3.5 ${initialFavorited ? 'fill-amber-500' : ''}`} />
      {initialFavorited ? 'Favorited' : 'Favorite'}
    </button>
  )
}
