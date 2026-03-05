import Link from 'next/link'
import type { AppPublication } from '@/lib/supabase/types'
import TimeAgo from '@/components/TimeAgo'

const TYPE_LABELS: Record<string, string> = {
  journal_article: 'Journal',
  preprint: 'Preprint',
  conference_paper: 'Conference',
  book_chapter: 'Book Chapter',
  thesis: 'Thesis',
  whitepaper: 'Whitepaper',
  technical_report: 'Tech Report',
  other: 'Other',
}

const TYPE_COLORS: Record<string, string> = {
  journal_article: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  preprint: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  conference_paper: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  book_chapter: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  thesis: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  whitepaper: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  technical_report: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

interface Props {
  publication: AppPublication
}

export function PublicationCard({ publication: p }: Props) {
  const typeColor = TYPE_COLORS[p.publicationType] ?? TYPE_COLORS.other
  const typeLabel = TYPE_LABELS[p.publicationType] ?? 'Other'
  const authorNames = p.authors?.slice(0, 3).map((a) => a.authorName) ?? []
  const extraAuthors = (p.authors?.length ?? 0) - 3

  return (
    <Link
      href={`/p/${p.slug}`}
      className="block rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card dark:border-white/[0.06]"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${typeColor}`}>
          {typeLabel}
        </span>
        {p.publishedYear && (
          <span className="text-xs text-muted-foreground">{p.publishedYear}</span>
        )}
      </div>

      <h3 className="mb-1 line-clamp-2 text-sm font-bold text-foreground leading-snug">
        {p.title}
      </h3>

      {p.abstract && (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
          {p.abstract}
        </p>
      )}

      {authorNames.length > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">
          {authorNames.join(', ')}
          {extraAuthors > 0 && ` +${extraAuthors} more`}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {p.doi && (
          <span className="truncate font-mono text-[10px]">DOI: {p.doi}</span>
        )}
        {p.created_at && (
          <TimeAgo date={new Date(p.created_at)} />
        )}
      </div>
    </Link>
  )
}
