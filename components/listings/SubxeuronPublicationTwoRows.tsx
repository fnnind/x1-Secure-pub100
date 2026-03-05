'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { AppSubxeuron } from '@/lib/supabase/types'
import type { AppPublication } from '@/lib/supabase/types'
import { toPublicImageUrl } from '@/lib/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 5

export interface SubxeuronPublicationTwoRowsProps {
  subxeurons: AppSubxeuron[]
  publications: AppPublication[]
  subxeuronsTotal: number
  publicationsTotal: number
  subPage: number
  pubPage: number
  basePath: string
  title: string
}

/**
 * Two-row layout: upper = SubXeurons list, lower = Publications list.
 * Each list paginated at PAGE_SIZE (5) with prev/next.
 */
export function SubxeuronPublicationTwoRows({
  subxeurons,
  publications,
  subxeuronsTotal,
  publicationsTotal,
  subPage,
  pubPage,
  basePath,
  title,
}: SubxeuronPublicationTwoRowsProps) {
  const subTotalPages = Math.max(1, Math.ceil(subxeuronsTotal / PAGE_SIZE))
  const pubTotalPages = Math.max(1, Math.ceil(publicationsTotal / PAGE_SIZE))

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>

      {/* Upper row: SubXeurons */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">SubXeurons</h2>
        <ul className="space-y-2">
          {subxeurons.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No subxeurons yet.
            </li>
          ) : (
            subxeurons.map((s) => (
              <li key={s._id} className="rounded-lg border border-border bg-card overflow-hidden">
                <Link
                  href={`/x/${s.slug}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    {s.image_url && (
                      <AvatarImage src={toPublicImageUrl(s.image_url)} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {s.title?.charAt(0) ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">{s.title}</div>
                    {s.description && (
                      <p className="truncate text-sm text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
        {subxeuronsTotal > PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-between">
            <Button variant="outline" size="sm" asChild disabled={subPage <= 1}>
              <Link href={subPage > 1 ? `${basePath}?subPage=${subPage - 1}&pubPage=${pubPage}` : basePath}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {subPage} of {subTotalPages}
            </span>
            <Button variant="outline" size="sm" asChild disabled={subPage >= subTotalPages}>
              <Link href={`${basePath}?subPage=${subPage + 1}&pubPage=${pubPage}`}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* Lower row: Publications */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Publications</h2>
        <ul className="space-y-2">
          {publications.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No publications yet.
            </li>
          ) : (
            publications.map((p) => (
              <li key={p._id} className="rounded-lg border border-border bg-card overflow-hidden">
                <Link
                  href={`/p/${p.slug}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                >
                  {p.image_url ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={toPublicImageUrl(p.image_url)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold">
                      {p.title?.charAt(0) ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">{p.title}</div>
                    {(p.description ?? p.abstract) && (
                      <p className="truncate text-sm text-muted-foreground">
                        {p.description ?? p.abstract}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
        {publicationsTotal > PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-between">
            <Button variant="outline" size="sm" asChild disabled={pubPage <= 1}>
              <Link href={pubPage > 1 ? `${basePath}?subPage=${subPage}&pubPage=${pubPage - 1}` : `${basePath}?subPage=${subPage}`}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pubPage} of {pubTotalPages}
            </span>
            <Button variant="outline" size="sm" asChild disabled={pubPage >= pubTotalPages}>
              <Link href={`${basePath}?subPage=${subPage}&pubPage=${pubPage + 1}`}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </section>
    </main>
  )
}
