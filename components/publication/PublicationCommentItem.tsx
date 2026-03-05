'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserCircle, MessageCircle, ArrowUp, ArrowDown } from 'lucide-react'
import Image from 'next/image'
import type { AppComment } from '@/lib/supabase/types'
import { useUser } from '@/lib/supabase/auth-context'
import { votePubComment } from '@/action/votePublicationComment'
import { PublicationCommentInput } from './PublicationCommentInput'
import TimeAgo from '@/components/TimeAgo'

interface Props {
  publicationId: string
  comment: AppComment
  userId: string | null
  depth?: number
}

export function PublicationCommentItem({ publicationId, comment, userId, depth = 0 }: Props) {
  const { isSignedIn } = useUser()
  const router = useRouter()
  const [isReplying, setIsReplying] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [optimisticVote, setOptimisticVote] = useState<'upvote' | 'downvote' | null>(
    comment.votes.voteStatus
  )
  const [optimisticScore, setOptimisticScore] = useState(comment.votes.netScore)

  const handleVote = (type: 'upvote' | 'downvote') => {
    if (!isSignedIn || isPending) return
    const isSame = optimisticVote === type
    const prev = optimisticVote
    const prevScore = optimisticScore
    setOptimisticVote(isSame ? null : type)
    setOptimisticScore((s) => {
      if (isSame) return type === 'upvote' ? s - 1 : s + 1
      if (prev === null) return type === 'upvote' ? s + 1 : s - 1
      return type === 'upvote' ? s + 2 : s - 2
    })
    startTransition(async () => {
      const result = await votePubComment(comment._id, type)
      if ('error' in result) {
        setOptimisticVote(prev)
        setOptimisticScore(prevScore)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <article className={`py-4 ${depth > 0 ? 'ml-6 border-l border-border pl-4' : ''}`}>
      <div className="flex gap-3">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={() => handleVote('upvote')}
            disabled={!isSignedIn || isPending}
            className={`rounded p-1 disabled:opacity-40 ${
              optimisticVote === 'upvote'
                ? 'text-orange-500'
                : 'text-muted-foreground hover:text-orange-500'
            }`}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-foreground">{optimisticScore}</span>
          <button
            onClick={() => handleVote('downvote')}
            disabled={!isSignedIn || isPending}
            className={`rounded p-1 disabled:opacity-40 ${
              optimisticVote === 'downvote'
                ? 'text-blue-500'
                : 'text-muted-foreground hover:text-blue-500'
            }`}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {comment.author?.imageUrl ? (
              <Image
                src={comment.author.imageUrl}
                alt={comment.author.username}
                width={24}
                height={24}
                className="rounded-full object-cover"
              />
            ) : (
              <UserCircle className="h-6 w-6 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">
              {comment.author?.username ?? 'Anonymous'}
            </span>
            {comment.createdAt && (
              <span className="text-xs text-muted-foreground">
                <TimeAgo date={new Date(comment.createdAt)} />
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-foreground">{comment.content}</p>

          {depth === 0 && (
            <button
              onClick={() => setIsReplying((v) => !v)}
              disabled={!isSignedIn}
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {isReplying ? 'Cancel' : 'Reply'}
            </button>
          )}

          {isReplying && (
            <div className="mt-3">
              <PublicationCommentInput
                publicationId={publicationId}
                parentId={comment._id}
                onDone={() => setIsReplying(false)}
              />
            </div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <PublicationCommentItem
                  key={reply._id}
                  publicationId={publicationId}
                  comment={reply}
                  userId={userId}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
