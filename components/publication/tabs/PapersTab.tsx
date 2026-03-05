import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { getPublicationComments } from '@/lib/supabase/publication-comments'
import { getPostsForPublication } from '@/lib/supabase/posts'
import { PublicationCommentList } from '../PublicationCommentList'
import { PublicationCommentInput } from '../PublicationCommentInput'
import Post from '@/components/post/Post'

interface Props {
  publicationId: string
  publicationSlug: string
  userId: string | null
}

export async function PapersTab({ publicationId, publicationSlug, userId }: Props) {
  const [comments, posts] = await Promise.all([
    getPublicationComments(publicationId, userId),
    getPostsForPublication(publicationId),
  ])

  return (
    <div className="space-y-8">
      {/* Discussion comments (inline, about the paper) */}
      <div>
        <PublicationCommentInput publicationId={publicationId} />
        <div className="mt-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Discussion ({comments.length})
          </h2>
          <PublicationCommentList
            publicationId={publicationId}
            comments={comments}
            userId={userId}
          />
        </div>
      </div>

      {/* Discussion posts */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Discussion Posts ({posts.length})
          </h2>
          {userId && (
            <Link
              href={`/create-post?publication=${publicationSlug}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <PenLine size={12} className="text-cyan-600 dark:text-cyan-400" />
              + Create Post
            </Link>
          )}
        </div>
        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <Post key={post._id} post={post} userId={userId} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No discussion posts yet.{userId ? ' Be the first to post!' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
