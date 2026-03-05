import Link from 'next/link'
import { FileText, ChevronRight } from 'lucide-react'
import type { AppPublication } from '@/lib/supabase/types'
import { ShareButton } from '@/components/ShareButton'

const TYPE_LABELS: Record<string, string> = {
  journal_article: 'Journal Article',
  preprint: 'Preprint',
  conference_paper: 'Conference Paper',
  book_chapter: 'Book Chapter',
  thesis: 'Thesis',
  whitepaper: 'Whitepaper',
  technical_report: 'Technical Report',
  other: 'Publication',
}

interface Props {
  publication: AppPublication
  userId?: string | null
}

export function PublicationBanner({ publication: p, userId }: Props) {
  const isCreator = userId && p.creator?._id === userId
  const typeLabel = TYPE_LABELS[p.publicationType] ?? 'Publication'

  // Build breadcrumb from field_of_study ("Computer Science > ML" → two parts)
  const breadcrumbs = p.fieldOfStudy
    ? p.fieldOfStudy.split('>').map((s) => s.trim()).filter(Boolean)
    : null

  // arXiv-style badge: prefer DOI, fall back to type label
  const idBadge = p.doi ? `arXiv:${p.doi}` : typeLabel

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-5">

        {/* Category breadcrumb */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                <Link
                  href={`/search?query=${encodeURIComponent(crumb)}`}
                  className="hover:text-foreground hover:underline"
                >
                  {crumb}
                </Link>
              </span>
            ))}
          </nav>
        )}

        {/* ID badge row */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded border border-red-300 bg-red-50 px-2 py-0.5 font-mono text-xs font-semibold text-red-700 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-400">
            {idBadge}
          </span>
          {p.publishedYear && (
            <span className="text-xs text-muted-foreground">[{p.publishedYear}]</span>
          )}
          {p.status === 'draft' && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Draft
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="mb-2 line-clamp-2 text-xl font-bold leading-snug text-foreground sm:line-clamp-none sm:text-2xl">
          {p.title}
        </h1>

        {/* Meta links row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Link href={`/p/${p.slug}`} className="hover:underline">
            xeuron.com/p/{p.slug}
          </Link>

          {p.creator && (
            <>
              <span className="text-border">·</span>
              <Link
                href={`/u/${p.creator.username}`}
                className="hover:text-foreground hover:underline"
              >
                u/{p.creator.username}
              </Link>
            </>
          )}

          {p.doi && (
            <>
              <span className="text-border">·</span>
              <a
                href={`https://doi.org/${p.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-500 hover:underline"
              >
                DOI
              </a>
            </>
          )}

          {p.source_url && (
            <>
              <span className="text-border">·</span>
              <a
                href={p.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-500 hover:underline"
              >
                Source
              </a>
            </>
          )}

          {p.pdf_url && (
            <>
              <span className="text-border">·</span>
              <a
                href={p.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium text-primary hover:bg-primary/20"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                PDF
              </a>
            </>
          )}
        </div>

        {/* Action bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ShareButton path={`/p/${p.slug}`} />
          {isCreator && (
            <>
              <Link
                href={`/p/${p.slug}/edit`}
                className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                Edit
              </Link>
              <Link
                href={`/p/${p.slug}/events/create`}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                + Add Event
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
