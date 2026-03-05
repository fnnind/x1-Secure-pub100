import { FileText } from 'lucide-react'
import type { AppPublication } from '@/lib/supabase/types'
import { PublicationMeta } from '../PublicationMeta'

interface Props {
  publication: AppPublication
  isCreator: boolean
}

export function DetailsTab({ publication: p, isCreator }: Props) {
  return (
    <div className="space-y-6">
      {/* Abstract */}
      {p.abstract && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Abstract
          </h2>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
            {p.abstract}
          </p>
        </section>
      )}

      {/* Bibliographic metadata */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Details
        </h2>
        <dl className="space-y-2 text-sm">
          {p.publishedYear && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">Year</dt>
              <dd className="text-foreground">{p.publishedYear}</dd>
            </div>
          )}
          {p.doi && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">DOI</dt>
              <dd>
                <a
                  href={`https://doi.org/${p.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 hover:underline"
                >
                  {p.doi}
                </a>
              </dd>
            </div>
          )}
          {p.source_url && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">Source</dt>
              <dd>
                <a
                  href={p.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-indigo-500 hover:underline"
                >
                  {p.source_url}
                </a>
              </dd>
            </div>
          )}
          {p.pdf_url && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">PDF</dt>
              <dd>
                <a
                  href={p.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  Download PDF
                </a>
              </dd>
            </div>
          )}
          {p.fieldOfStudy && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">Field</dt>
              <dd className="text-foreground">{p.fieldOfStudy}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Tags */}
      {p.tags && p.tags.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {p.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      <PublicationMeta publication={p} isCreator={isCreator} />
    </div>
  )
}
