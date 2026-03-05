'use client'

import { useTransition, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export type PubTab = 'papers' | 'events' | 'qa' | 'details' | 'references'

const TABS: { key: PubTab; label: string }[] = [
  { key: 'papers',     label: 'Papers'     },
  { key: 'events',     label: 'Events'     },
  { key: 'qa',         label: 'Q&A'        },
  { key: 'details',    label: 'Details'    },
  { key: 'references', label: 'References' },
]

interface Props {
  activeTab: PubTab
  slug: string
  commentCount?: number
  eventCount?: number
}

export function PublicationTabs({ activeTab, slug, commentCount, eventCount }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticTab, setOptimisticTab] = useState<PubTab | null>(null)

  const displayTab = optimisticTab ?? activeTab

  // Clear optimistic state once the server confirms the new tab
  useEffect(() => {
    setOptimisticTab(null)
  }, [activeTab])

  const navigate = (tab: PubTab) => {
    if (tab === displayTab) return
    setOptimisticTab(tab)
    startTransition(() => {
      router.push(`/p/${slug}?tab=${tab}`)
    })
  }

  return (
    <div className="border-b border-border">
      <nav
        className={`mx-auto max-w-7xl overflow-x-auto px-4 scrollbar-none transition-opacity duration-150 ${isPending ? 'opacity-60' : ''}`}
      >
        <ul className="flex min-w-max gap-0">
          {TABS.map(({ key, label }) => {
            const isActive = displayTab === key
            const badge =
              key === 'papers' && commentCount != null
                ? commentCount
                : key === 'events' && eventCount != null
                ? eventCount
                : null

            return (
              <li key={key}>
                <button
                  onClick={() => navigate(key)}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-indigo-500'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                  {badge != null && badge > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs leading-none">
                      {badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
