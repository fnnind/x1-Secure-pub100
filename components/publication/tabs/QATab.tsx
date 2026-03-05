import { getPublicationComments } from '@/lib/supabase/publication-comments'
import { PublicationCommentList } from '../PublicationCommentList'
import { PublicationCommentInput } from '../PublicationCommentInput'

interface Props {
  publicationId: string
  userId: string | null
}

export async function QATab({ publicationId, userId }: Props) {
  const comments = await getPublicationComments(publicationId, userId)

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Ask questions and discuss this publication with the community.
      </p>
      <PublicationCommentInput publicationId={publicationId} />
      <div className="mt-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Comments ({comments.length})
        </h2>
        <PublicationCommentList
          publicationId={publicationId}
          comments={comments}
          userId={userId}
        />
      </div>
    </div>
  )
}
