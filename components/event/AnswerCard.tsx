'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AppEventAnswer } from '@/lib/supabase/types'
import { voteAnswer } from '@/action/voteEventQA'
import { ChevronUp, ChevronDown } from 'lucide-react'
import TimeAgo from '@/components/TimeAgo'

interface Props {
  answer: AppEventAnswer
  userId?: string | null
}

export function AnswerCard({ answer: a, userId }: Props) {
  const [votes, setVotes] = useState(a.votes)
  const [isVoting, setIsVoting] = useState(false)

  const handleVote = async (type: 'upvote' | 'downvote') => {
    if (!userId || isVoting) return
    setIsVoting(true)
    const newType = votes.voteStatus === type ? null : type
    const delta = {
      upvotes: newType === 'upvote' ? votes.upvotes + 1 : votes.voteStatus === 'upvote' ? votes.upvotes - 1 : votes.upvotes,
      downvotes: newType === 'downvote' ? votes.downvotes + 1 : votes.voteStatus === 'downvote' ? votes.downvotes - 1 : votes.downvotes,
    }
    setVotes({ ...delta, netScore: delta.upvotes - delta.downvotes, voteStatus: newType })
    await voteAnswer({ answerId: a._id, voteType: newType })
    setIsVoting(false)
  }

  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${a.isAccepted ? 'border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/10' : 'border-border bg-muted/20'}`}>
      {/* Vote column */}
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <button
          onClick={() => handleVote('upvote')}
          disabled={!userId}
          className={`rounded p-0.5 hover:bg-muted ${votes.voteStatus === 'upvote' ? 'text-indigo-600' : 'text-muted-foreground'}`}
        >
          <ChevronUp size={14} />
        </button>
        <span className="text-xs font-bold text-foreground">{votes.netScore}</span>
        <button
          onClick={() => handleVote('downvote')}
          disabled={!userId}
          className={`rounded p-0.5 hover:bg-muted ${votes.voteStatus === 'downvote' ? 'text-red-500' : 'text-muted-foreground'}`}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {a.isAccepted && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
              ✓ Accepted
            </span>
          )}
          {a.author && (
            <Link href={`/u/${a.author.username}`} className="text-xs font-medium text-muted-foreground hover:underline">
              {a.author.username}
            </Link>
          )}
          <TimeAgo date={new Date(a.createdAt)} />
        </div>
        <p className="text-sm text-foreground whitespace-pre-line">{a.content}</p>
      </div>
    </div>
  )
}
