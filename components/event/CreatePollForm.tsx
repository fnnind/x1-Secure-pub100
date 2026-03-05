'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createPoll } from '@/action/createPoll'
import { Plus, Trash2 } from 'lucide-react'

/** Convert ISO string to datetime-local value (YYYY-MM-DDTHH:mm) in user's local time */
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  eventId: string
  backHref: string
  /** Default: 1 hour after event (creator can overwrite). ISO string. */
  defaultClosesAt?: string
}

const DEFAULT_OPTIONS = ['', '']

export function CreatePollForm({ eventId, backHref, defaultClosesAt }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [allowMultipleChoice, setAllowMultipleChoice] = useState(false)
  const [showResultsBeforeClose, setShowResultsBeforeClose] = useState(true)
  const [closesAt, setClosesAt] = useState(() =>
    defaultClosesAt ? isoToDatetimeLocal(defaultClosesAt) : ''
  )
  const [options, setOptions] = useState<string[]>(DEFAULT_OPTIONS)

  const addOption = () => setOptions((prev) => [...prev, ''])
  const removeOption = (index: number) => {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }
  const setOption = (index: number, value: string) => {
    setOptions((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean)
    if (!question.trim()) { setError('Poll question is required'); return }
    if (trimmedOptions.length < 2) { setError('At least 2 options are required'); return }
    if (!closesAt) { setError('Close date/time is required'); return }
    if (new Date(closesAt) <= new Date()) { setError('Close time must be in the future'); return }

    setIsLoading(true)
    try {
      const result = await createPoll({
        eventId,
        question: question.trim(),
        description: description.trim() || undefined,
        allowMultipleChoice,
        closesAt: new Date(closesAt).toISOString(),
        showResultsBeforeClose,
        options: trimmedOptions,
      })
      if ('error' in result) { setError(result.error); return }
      router.push(backHref)
    } catch {
      setError('Failed to create poll')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium">Poll question *</label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Which topic should we cover next?"
          maxLength={300}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Description (optional)</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief context for the poll"
          rows={2}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Options * (at least 2)</label>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={200}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeOption(i)}
              disabled={options.length <= 2}
              aria-label="Remove option"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1">
          <Plus className="h-4 w-4" /> Add option
        </Button>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Closes at *</label>
        <Input
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Default: 1 hour after event. You can change it.
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={allowMultipleChoice}
            onChange={(e) => setAllowMultipleChoice(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">Allow multiple choice</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showResultsBeforeClose}
            onChange={(e) => setShowResultsBeforeClose(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">Show results before close</span>
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading || !question.trim() || !closesAt}>
          {isLoading ? 'Creating…' : 'Create poll'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(backHref)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
