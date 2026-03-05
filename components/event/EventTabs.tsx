'use client'

import { useTransition, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export type EventTab = 'qa' | 'polls' | 'discussions' | 'info'

const TABS: { key: EventTab; label: string }[] = [
  { key: 'qa',          label: 'Q&A'         },
  { key: 'polls',       label: 'Polls'       },
  { key: 'discussions', label: 'Discussions' },
  { key: 'info',        label: 'Info'        },
]

interface Props {
  activeTab: EventTab
  /** Base path without query string, e.g. /p/my-pub/events/abc123 */
  eventPath: string
}

export function EventTabs({ activeTab, eventPath }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticTab, setOptimisticTab] = useState<EventTab | null>(null)

  const displayTab = optimisticTab ?? activeTab

  useEffect(() => {
    setOptimisticTab(null)
  }, [activeTab])

  const navigate = (tab: EventTab) => {
    if (tab === displayTab) return
    setOptimisticTab(tab)
    startTransition(() => {
      router.push(`${eventPath}?tab=${tab}`)
    })
  }

  return (
    <div
      className={`mb-6 flex gap-1 rounded-xl border border-border bg-muted/30 p-1 transition-opacity duration-150 ${isPending ? 'opacity-60' : ''}`}
    >
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => navigate(key)}
          className={`flex-1 rounded-lg py-1.5 text-center text-sm font-medium transition-colors ${
            displayTab === key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
