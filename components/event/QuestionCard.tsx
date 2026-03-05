'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AppEventQuestion } from '@/lib/supabase/types'
import { AnswerCard } from './AnswerCard'
import { voteQuestion } from '@/action/voteEventQA'
import { createAnswer } from '@/action/createAnswer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChevronUp, ChevronDown, MessageSquare } from 'lucide-react'
import TimeAgo from '@/components/TimeAgo'
import { ShareButton } from '@/components/ShareButton'

interface Props {
  question: AppEventQuestion
  userId?: string | null
  isQaLocked?: boolean
  eventId: string
  publicationSlug?: string
}

export function QuestionCard({ question: q, userId, isQaLocked, eventId, publicationSlug }: Props) {
  const [votes, setVotes] = useState(q.votes)
  const [answers, setAnswers] = useState(q.answers ?? [])
  const [showAnswerInput, setShowAnswerInput] = useState(false)
  const [answerContent, setAnswerContent] = useState('')
  const [isVoting, setIsVoting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [answerError, setAnswerError] = useState('')

  const handleVote = async (type: 'upvote' | 'downvote') => {
    if (!userId || isVoting) return
    setIsVoting(true)
    const newType = votes.voteStatus === type ? null : type
    const delta = {
      upvotes: newType === 'upvote' ? votes.upvotes + 1 : votes.voteStatus === 'upvote' ? votes.upvotes - 1 : votes.upvotes,
      downvotes: newType === 'downvote' ? votes.downvotes + 1 : votes.voteStatus === 'downvote' ? votes.downvotes - 1 : votes.downvotes,
    }
    setVotes({ ...delta, netScore: delta.upvotes - delta.downvotes, voteStatus: newType })
    await voteQuestion({ questionId: q._id, voteType: newType })
    setIsVoting(false)
  }

  const handleAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answerContent.trim() || isSubmitting) return
    setIsSubmitting(true)
    setAnswerError('')
    try {
      const result = await createAnswer({ questionId: q._id, content: answerContent.trim() })
      if ('error' in result) { setAnswerError(result.error); return }
      // optimistic: add placeholder answer until page refresh
      setAnswers((prev) => [...prev, {
        _id: result.answer._id,
        content: answerContent.trim(),
        isAccepted: false,
        votes: { upvotes: 0, downvotes: 0, netScore: 0, voteStatus: null },
        createdAt: new Date().toISOString(),
      }])
      setAnswerContent('')
      setShowAnswerInput(false)
    } catch {
      setAnswerError('Failed to post answer')
    } finally {
      setIsSubmitting(false)
    }
  }

  const sharePath = publicationSlug
    ? `/p/${publicationSlug}/events/${eventId}?tab=qa#question-${q._id}`
    : `/events/${eventId}?tab=qa#question-${q._id}`

  return (
    <div id={`question-${q._id}`} className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Question row */}
      <div className="flex gap-3">
        {/* Vote column: upvote / score / downvote */}
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleVote('upvote')}
            disabled={!userId}
            title={userId ? 'Vote up' : 'Sign in to vote'}
            className={`flex flex-col items-center rounded p-1.5 transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${votes.voteStatus === 'upvote' ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ChevronUp size={18} aria-hidden />
            <span className="text-[10px] font-medium uppercase tracking-wide">Vote up</span>
          </button>
          <span className="text-sm font-bold text-foreground tabular-nums" aria-label="Score">
            {votes.netScore}
          </span>
          <button
            type="button"
            onClick={() => handleVote('downvote')}
            disabled={!userId}
            title={userId ? 'Vote down' : 'Sign in to vote'}
            className={`flex flex-col items-center rounded p-1.5 transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${votes.voteStatus === 'downvote' ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ChevronDown size={18} aria-hidden />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {q.isPinned && (
            <div className="mb-1">
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                📌 Pinned
              </span>
            </div>
          )}
          <p className="text-sm text-foreground whitespace-pre-line">{q.content}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            {q.author && (
              <Link href={`/u/${q.author.username}`} className="font-medium hover:underline">
                {q.author.username}
              </Link>
            )}
            <span className="text-xs"><TimeAgo date={new Date(q.createdAt)} /></span>
            {!isQaLocked && userId && (
              <button
                onClick={() => setShowAnswerInput((v) => !v)}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <MessageSquare size={12} />
                {answers.length > 0 ? `${answers.length} answer${answers.length !== 1 ? 's' : ''}` : 'Answer'}
              </button>
            )}
            <ShareButton path={sharePath} />
          </div>
        </div>
      </div>

      {/* Answers */}
      {answers.length > 0 && (
        <div className="ml-8 space-y-2">
          {answers.map((ans) => (
            <AnswerCard key={ans._id} answer={ans} userId={userId} />
          ))}
        </div>
      )}

      {/* Answer input */}
      {showAnswerInput && !isQaLocked && (
        <form onSubmit={handleAnswer} className="ml-8 space-y-2">
          <Textarea
            value={answerContent}
            onChange={(e) => setAnswerContent(e.target.value)}
            placeholder="Write your answer… Use @username to mention"
            rows={3}
            maxLength={2000}
          />
          {answerError && <p className="text-xs text-red-500">{answerError}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAnswerInput(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !answerContent.trim()} size="sm">
              {isSubmitting ? 'Posting…' : 'Post Answer'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
