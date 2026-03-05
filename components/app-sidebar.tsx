import * as React from "react"
import { FlameIcon, HomeIcon, TrendingUpIcon } from "lucide-react"

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
import { SidebarNavCollapsibles } from "@/components/sidebar-nav-collapsibles"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

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

  const navMain = [
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

  const eventsData = {
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
          <SidebarNavCollapsibles navMain={navMain} eventsData={eventsData} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
