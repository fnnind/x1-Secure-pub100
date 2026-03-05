import { ExternalLink } from 'lucide-react'
import type { AppPublication } from '@/lib/supabase/types'

interface Props {
  publication: AppPublication
}

export function ReferencesTab({ publication: p }: Props) {
  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-foreground">References</h2>

      {p.source_url ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-sm text-muted-foreground">
            Full reference list available at the source publication.
          </p>
          <a
            href={p.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700/50 dark:bg-indigo-900/20 dark:text-indigo-300"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View on source
          </a>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No reference data available. Add a source URL to enable this section.
          </p>
        </div>
      )}
    </div>
  )
}
