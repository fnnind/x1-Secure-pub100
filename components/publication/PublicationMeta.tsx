'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AppPublication } from '@/lib/supabase/types'
import { LinkSubxeuronPanel } from './LinkSubxeuronPanel'

interface Props {
  publication: AppPublication
  isCreator?: boolean
  className?: string
}

export function PublicationMeta({ publication: p, isCreator, className }: Props) {
  const [query, setQuery] = useState('')

  const filteredTags = query.trim()
    ? (p.tags ?? []).filter((t) => t.toLowerCase().includes(query.toLowerCase()))
    : (p.tags ?? [])

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      {/* Topic search */}
      {(p.tags ?? []).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Topics</h3>
          <input
            type="search"
            placeholder="Search topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap gap-1.5">
            {filteredTags.length > 0 ? (
              filteredTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?query=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  #{tag}
                </Link>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No matching topics.</p>
            )}
          </div>
        </div>
      )}

      {/* Linked SubXeurons */}
      {(p.linkedSubxeurons ?? []).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Linked SubXeurons</h3>
          <ul className="space-y-1">
            {(p.linkedSubxeurons ?? []).map((sx) => (
              <li key={sx._id}>
                <Link
                  href={`/x/${sx.slug}`}
                  className="text-sm text-indigo-500 hover:underline"
                >
                  x/{sx.slug}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Creator link panel (only for creator) */}
      {isCreator && <LinkSubxeuronPanel publicationId={p._id} />}

    </div>
  )
}
