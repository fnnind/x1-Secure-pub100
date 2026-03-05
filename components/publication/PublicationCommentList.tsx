import type { AppComment } from '@/lib/supabase/types'
import { PublicationCommentItem } from './PublicationCommentItem'

interface Props {
  publicationId: string
  comments: AppComment[]
  userId: string | null
}

export function PublicationCommentList({ publicationId, comments, userId }: Props) {
  return (
    <section>
      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="divide-y divide-border">
          {comments.map((c) => (
            <PublicationCommentItem
              key={c._id}
              publicationId={publicationId}
              comment={c}
              userId={userId}
            />
          ))}
        </div>
      )}
    </section>
  )
}
