'use client'

import { useState } from 'react'
import type { AppPoll } from '@/lib/supabase/types'
import { PollResults } from './PollResults'
import { submitPollVote } from '@/action/submitPollVote'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/ShareButton'

interface Props {
  poll: AppPoll
  userId?: string | null
  eventId: string
  publicationSlug?: string
}

function formatCloseTime(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return 'Closed'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `Closes in ${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `Closes in ${h}h ${m}m`
  return `Closes in ${m}m`
}

export function PollCard({ poll, userId, eventId, publicationSlug }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(poll.userVotedOptionIds ?? [])
  const [hasVoted, setHasVoted] = useState((poll.userVotedOptionIds?.length ?? 0) > 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pollState, setPollState] = useState(poll)

  const toggleOption = (id: string) => {
    if (hasVoted || poll.isClosed) return
    if (poll.allowMultipleChoice) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
    } else {
      setSelectedIds([id])
    }
  }

  const handleVote = async () => {
    if (!userId || !selectedIds.length || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const result = await submitPollVote({ pollId: poll._id, optionIds: selectedIds })
      if ('error' in result) { setError(result.error); return }
      setHasVoted(true)
    } catch {
      setError('Failed to submit vote')
    } finally {
      setIsSubmitting(false)
    }
  }

  const showResults =
    hasVoted || poll.isClosed || (poll.showResultsBeforeClose && !poll.isClosed)

  const sharePath = publicationSlug
    ? `/p/${publicationSlug}/events/${eventId}?tab=polls#poll-${poll._id}`
    : `/events/${eventId}?tab=polls#poll-${poll._id}`

  return (
    <div id={`poll-${poll._id}`} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-foreground text-sm">{poll.question}</h4>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-xs ${poll.isClosed ? 'bg-gray-100 text-gray-500 dark:bg-gray-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
            {poll.isClosed ? 'Closed' : formatCloseTime(poll.closesAt)}
          </span>
          <ShareButton path={sharePath} />
        </div>
      </div>

      {poll.description && (
        <p className="text-xs text-muted-foreground">{poll.description}</p>
      )}

      {poll.allowMultipleChoice && !hasVoted && !poll.isClosed && (
        <p className="text-xs text-muted-foreground italic">Select all that apply</p>
      )}

      {/* Options / voting */}
      {!hasVoted && !poll.isClosed && userId ? (
        <div className="space-y-2">
          {poll.options.sort((a, b) => a.optionOrder - b.optionOrder).map((opt) => {
            const isSelected = selectedIds.includes(opt._id)
            return (
              <button
                key={opt._id}
                type="button"
                onClick={() => toggleOption(opt._id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                    : 'border-border bg-muted/20 text-foreground hover:bg-muted/40'
                }`}
              >
                {opt.optionText}
              </button>
            )
          })}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button
            onClick={handleVote}
            disabled={!selectedIds.length || isSubmitting}
            size="sm"
            className="w-full"
          >
            {isSubmitting ? 'Voting…' : 'Vote'}
          </Button>
        </div>
      ) : (
        <PollResults
          options={poll.options}
          totalVotes={poll.totalVotes}
          userVotedOptionIds={selectedIds}
          showResults={showResults}
        />
      )}

      {!userId && !poll.isClosed && (
        <p className="text-xs text-muted-foreground italic">Log in to vote.</p>
      )}
    </div>
  )
}
