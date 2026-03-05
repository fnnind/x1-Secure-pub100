'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

interface Props {
  abstract?: string | null
}

export function PublicationAISummary({ abstract }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!abstract) return null

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-700/40 dark:bg-indigo-900/10">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
          <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">AI Summary</h2>
        </div>

        <p
          className={`text-sm leading-relaxed text-foreground transition-all ${
            expanded ? '' : 'line-clamp-3 md:line-clamp-none'
          }`}
        >
          {abstract}
        </p>

        {/* Toggle visible only on mobile (md:hidden) */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 md:hidden"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show more
            </>
          )}
        </button>
      </div>
    </div>
  )
}
