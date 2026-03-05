'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/supabase/auth-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createPublicationComment } from '@/action/createPublicationComment'

interface Props {
  publicationId: string
  parentId?: string
  onDone?: () => void
}

export function PublicationCommentInput({ publicationId, parentId, onDone }: Props) {
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { user } = useUser()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    startTransition(async () => {
      const result = await createPublicationComment(publicationId, content.trim(), parentId)
      if (!('error' in result)) {
        setContent('')
        router.refresh()
        onDone?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
        disabled={isPending || !user}
        maxLength={2000}
      />
      <Button
        type="submit"
        variant="outline"
        disabled={isPending || !user || !content.trim()}
      >
        {isPending ? 'Posting…' : 'Comment'}
      </Button>
    </form>
  )
}
