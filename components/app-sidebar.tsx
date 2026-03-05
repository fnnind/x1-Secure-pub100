import * as React from "react"
import { CalendarDays, FlameIcon, HomeIcon, Minus, Plus, TrendingUpIcon } from "lucide-react"

import XeruonLogoLong from "@/images/XeuronLogoLong.png";
import Image from "next/image";
import Link from "next/link";

import { SearchForm } from "@/components/search-form"
import { getSubxeurons } from "@/lib/supabase/subxeurons"
import { getPublications } from "@/lib/supabase/publications"
import { getEventsCreatedByUser } from "@/lib/supabase/events"
import { getEventsFavoritedByUser } from "@/lib/supabase/event-favorites"
import { getUser } from "@/lib/supabase/user"
import CreateSubXeuronButton from "@/components/header/CreateSubXeuronButton"
import { CreatePublicationButton } from "@/components/publication/CreatePublicationButton"
import { CreateEventButton } from "@/components/event/CreateEventButton"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"

type SidebarNavItem = {
  title: string
  landingUrl: string
  items: { title: string; url: string; isActive: boolean }[]
}

type EventsSidebarData = {
  createdByMe: { title: string; url: string }[]
  favorites: { title: string; url: string }[]
}

function eventHref(event: { _id: string; publicationSlug?: string | null }): string {
  return event.publicationSlug
    ? `/p/${event.publicationSlug}/events/${event._id}`
    : `/events/${event._id}`
}

export async function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = await getUser()
  const userId = 'error' in user ? null : user._id

  const [subxeurons, publications, eventsCreated, eventsFavorites] = await Promise.all([
    getSubxeurons(),
    getPublications(),
    userId ? getEventsCreatedByUser(userId) : Promise.resolve([]),
    userId ? getEventsFavoritedByUser(userId) : Promise.resolve([]),
  ])

  const navMain: SidebarNavItem[] = [
    {
      title: 'SubXeurons',
      landingUrl: '/subxeurons',
      items:
        subxeurons?.map((s) => ({
          title: s.title || '',
          url: `/x/${s.slug}`,
          isActive: false,
        })) ?? [],
    },
    {
      title: 'Publications',
      landingUrl: '/publications',
      items:
        publications?.map((p) => ({
          title: p.title || '',
          url: `/p/${p.slug}`,
          isActive: false,
        })) ?? [],
    },
  ]

  const eventsData: EventsSidebarData = {
    createdByMe: eventsCreated.map((e) => ({ title: e.title, url: eventHref(e) })),
    favorites: eventsFavorites.map((e) => ({ title: e.title, url: eventHref(e) })),
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="https://www.xeuron.com">
                <Image src={XeruonLogoLong} alt="Xeuron logo" width={150} height={150} className="hidden md:block" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchForm />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <CreateSubXeuronButton />
              <CreatePublicationButton />
              <CreateEventButton />
              <SidebarMenuButton asChild className="p-5">
                <Link href="/">
                  <HomeIcon className="mr-2 h-4 w-4" />
                  Home
                </Link>
              </SidebarMenuButton>
              <SidebarMenuButton asChild className="p-5">
                <Link href="/popular">
                  <TrendingUpIcon className="mr-2 h-4 w-4" />
                  Popular
                </Link>
              </SidebarMenuButton>
              <SidebarMenuButton asChild className="p-5">
                <Link href="/hot">
                  <FlameIcon className="mr-2 h-4 w-4" />
                  Hot/Controversial
                </Link>
              </SidebarMenuButton>


            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarGroup>




        <SidebarGroup>
          <SidebarMenu>
            {navMain.map((item, index) => (
              <Collapsible
                key={item.title}
                defaultOpen={index === 0}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <div className="flex w-full items-center gap-2">
                    <SidebarMenuButton asChild className="min-w-0 flex-1 truncate">
                      <Link href={item.landingUrl}>
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 rounded p-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        aria-label={item.items?.length ? 'Toggle list' : undefined}
                      >
                        <Plus className="h-4 w-4 group-data-[state=open]/collapsible:hidden" />
                        <Minus className="h-4 w-4 group-data-[state=closed]/collapsible:hidden" />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  {item.items?.length ? (
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
                  ) : null}
                </SidebarMenuItem>
              </Collapsible>
            ))}

            {/* Events section: Created by me + Favorites */}
            <Collapsible defaultOpen={false} className="group/collapsible">
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
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
