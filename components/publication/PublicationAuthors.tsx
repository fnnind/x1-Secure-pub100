import Link from 'next/link'
import type { AppPublicationAuthor } from '@/lib/supabase/types'

interface Props {
  authors: AppPublicationAuthor[]
}

export function PublicationAuthors({ authors }: Props) {
  if (!authors.length) return null
  const sorted = [...authors].sort((a, b) => a.authorOrder - b.authorOrder)

  return (
    <div className="flex flex-wrap gap-x-1 gap-y-0.5 text-sm text-muted-foreground">
      {sorted.map((author, i) => (
        <span key={author._id}>
          {author.user ? (
            <Link
              href={`/u/${author.user.username}`}
              className="font-medium text-foreground hover:underline"
            >
              {author.authorName}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{author.authorName}</span>
          )}
          {author.isCorresponding && (
            <span title="Corresponding author" className="ml-0.5 text-indigo-500">*</span>
          )}
          {author.affiliation && (
            <span className="ml-0.5 text-xs">({author.affiliation})</span>
          )}
          {i < sorted.length - 1 && <span className="mr-1">,</span>}
        </span>
      ))}
    </div>
  )
}
