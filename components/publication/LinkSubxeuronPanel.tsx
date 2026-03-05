'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { linkPublication } from '@/action/linkPublication'

interface Props {
  publicationId: string
}

export function LinkSubxeuronPanel({ publicationId }: Props) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setIsLoading(true)
    setMessage(null)
    try {
      const result = await linkPublication({ publicationId, input: input.trim() })
      if ('error' in result) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Linked successfully!' })
        setInput('')
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to create link' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold text-foreground">Link to SubXeuron</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Paste a SubXeuron path (e.g. <code className="rounded bg-muted px-1">/x/deep-learning</code>)
      </p>
      <form onSubmit={handleLink} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="/x/subxeuron-slug"
          className="flex-1 text-sm"
        />
        <Button type="submit" disabled={isLoading || !input.trim()} size="sm">
          {isLoading ? '…' : 'Link'}
        </Button>
      </form>
      {message && (
        <p className={`mt-2 text-xs ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
