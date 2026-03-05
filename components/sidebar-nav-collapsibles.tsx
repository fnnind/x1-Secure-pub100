'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'

export type SidebarNavItem = {
  title: string
  landingUrl: string
  items: { title: string; url: string; isActive: boolean }[]
}

export type EventsSidebarData = {
  createdByMe: { title: string; url: string }[]
  favorites: { title: string; url: string }[]
}

const STORAGE_KEY = 'sidebar:open'

function readStorage(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStorage(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore (private browsing / quota exceeded)
  }
}

interface Props {
  navMain: SidebarNavItem[]
  eventsData: EventsSidebarData
}

export function SidebarNavCollapsibles({ navMain, eventsData }: Props) {
  // Default: all sections open
  const defaults: Record<string, boolean> = {}
  for (const item of navMain) defaults[item.title] = true
  defaults['events'] = true

  const [openState, setOpenState] = useState<Record<string, boolean>>(defaults)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = readStorage()
    // Merge defaults with saved preferences (saved wins)
    setOpenState({ ...defaults, ...saved })
    setHydrated(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (key: string, open: boolean) => {
    const next = { ...openState, [key]: open }
    setOpenState(next)
    writeStorage(next)
  }

  // Before hydration use defaults (avoids layout shift on first paint)
  const isOpen = (key: string) => (hydrated ? openState[key] ?? true : true)

  return (
    <SidebarMenu>
      {navMain.map((item) => (
        <Collapsible
          key={item.title}
          open={isOpen(item.title)}
          onOpenChange={(open) => toggle(item.title, open)}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <div className="flex w-full items-center gap-2">
              <SidebarMenuButton asChild className="min-w-0 flex-1 truncate">
                <Link href={item.landingUrl}>{item.title}</Link>
              </SidebarMenuButton>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 rounded p-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  aria-label="Toggle list"
                >
                  <Plus className="h-4 w-4 group-data-[state=open]/collapsible:hidden" />
                  <Minus className="h-4 w-4 group-data-[state=closed]/collapsible:hidden" />
                </button>
              </CollapsibleTrigger>
            </div>
            {item.items.length > 0 && (
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.url}>
                      <SidebarMenuSubButton asChild isActive={subItem.isActive}>
                        <Link href={subItem.url}>{subItem.title}</Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            )}
          </SidebarMenuItem>
        </Collapsible>
      ))}

      {/* Events section */}
      <Collapsible
        open={isOpen('events')}
        onOpenChange={(open) => toggle('events', open)}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <div className="flex w-full items-center gap-2">
            <SidebarMenuButton asChild className="flex min-w-0 flex-1 items-center truncate">
              <Link href="/events" className="flex min-w-0 flex-1 items-center truncate">
                <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                Events
              </Link>
            </SidebarMenuButton>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded p-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Toggle events list"
              >
                <Plus className="h-4 w-4 group-data-[state=open]/collapsible:hidden" />
                <Minus className="h-4 w-4 group-data-[state=closed]/collapsible:hidden" />
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <span className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Created by me
                </span>
              </SidebarMenuSubItem>
              {eventsData.createdByMe.length === 0 ? (
                <SidebarMenuSubItem>
                  <span className="px-2 text-xs text-muted-foreground">None yet</span>
                </SidebarMenuSubItem>
              ) : (
                eventsData.createdByMe.map((e) => (
                  <SidebarMenuSubItem key={e.url}>
                    <SidebarMenuSubButton asChild>
                      <Link href={e.url}>{e.title}</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))
              )}
              <SidebarMenuSubItem>
                <span className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Favorites
                </span>
              </SidebarMenuSubItem>
              {eventsData.favorites.length === 0 ? (
                <SidebarMenuSubItem>
                  <span className="px-2 text-xs text-muted-foreground">None yet</span>
                </SidebarMenuSubItem>
              ) : (
                eventsData.favorites.map((e) => (
                  <SidebarMenuSubItem key={e.url}>
                    <SidebarMenuSubButton asChild>
                      <Link href={e.url}>{e.title}</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  )
}
