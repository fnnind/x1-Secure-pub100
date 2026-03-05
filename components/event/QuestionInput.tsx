'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createQuestion } from '@/action/createQuestion'

interface Props {
  eventId: string
  onSubmitted?: () => void
}

export function QuestionInput({ eventId, onSubmitted }: Props) {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setIsLoading(true)
    setError('')
    try {
      const result = await createQuestion({ eventId, content: content.trim() })
      if ('error' in result) { setError(result.error); return }
      setContent('')
      onSubmitted?.()
    } catch {
      setError('Failed to post question')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Ask a question… Use @username to mention someone"
        rows={3}
        maxLength={2000}
        className="resize-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !content.trim()} size="sm">
          {isLoading ? 'Posting…' : 'Post Question'}
        </Button>
      </div>
    </form>
  )
}
