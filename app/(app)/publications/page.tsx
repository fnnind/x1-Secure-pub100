import Link from 'next/link'
import Image from 'next/image'
import { getPublications } from '@/lib/supabase/publications'
import { toPublicImageUrl } from '@/lib/image'

const TOP_N = 5

export default async function PublicationsLandingPage() {
  const [byDate, byTitle] = await Promise.all([
    getPublications({ limit: TOP_N, sortBy: 'created_at', ascending: false }),
    getPublications({ limit: TOP_N, sortBy: 'title', ascending: true }),
  ])

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">Publications</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Top {TOP_N} by date</h2>
        <ul className="space-y-2">
          {byDate.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No publications yet.
            </li>
          ) : (
            byDate.map((p) => (
              <li key={p._id} className="overflow-hidden rounded-lg border border-border bg-card">
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 font-semibold text-primary">
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
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Top {TOP_N} by title (A–Z)</h2>
        <ul className="space-y-2">
          {byTitle.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No publications yet.
            </li>
          ) : (
            byTitle.map((p) => (
              <li key={p._id} className="overflow-hidden rounded-lg border border-border bg-card">
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 font-semibold text-primary">
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
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Top {TOP_N} most recent</h2>
        <p className="mb-2 text-xs text-muted-foreground">Same as &quot;by date&quot; until upvotes/views are added.</p>
        <ul className="space-y-2">
          {byDate.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No publications yet.
            </li>
          ) : (
            byDate.slice(0, TOP_N).map((p) => (
              <li key={p._id} className="overflow-hidden rounded-lg border border-border bg-card">
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 font-semibold text-primary">
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
      </section>
    </main>
  )
}
