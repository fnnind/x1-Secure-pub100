import Link from 'next/link'
import { getSubxeurons } from '@/lib/supabase/subxeurons'
import { toPublicImageUrl } from '@/lib/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const TOP_N = 5

export default async function SubxeuronsLandingPage() {
  const [byDate, byTitle] = await Promise.all([
    getSubxeurons({ limit: TOP_N, sortBy: 'created_at', ascending: false }),
    getSubxeurons({ limit: TOP_N, sortBy: 'title', ascending: true }),
  ])

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">SubXeurons</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Top {TOP_N} by date</h2>
        <ul className="space-y-2">
          {byDate.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No subxeurons yet.
            </li>
          ) : (
            byDate.map((s) => (
              <li key={s._id} className="overflow-hidden rounded-lg border border-border bg-card">
                <Link
                  href={`/x/${s.slug}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    {s.image_url && (
                      <AvatarImage src={toPublicImageUrl(s.image_url)} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
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
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Top {TOP_N} by name (A–Z)</h2>
        <ul className="space-y-2">
          {byTitle.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No subxeurons yet.
            </li>
          ) : (
            byTitle.map((s) => (
              <li key={s._id} className="overflow-hidden rounded-lg border border-border bg-card">
                <Link
                  href={`/x/${s.slug}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    {s.image_url && (
                      <AvatarImage src={toPublicImageUrl(s.image_url)} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
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
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Top {TOP_N} most recent</h2>
        <p className="mb-2 text-xs text-muted-foreground">Same as &quot;by date&quot; until upvotes/views are added.</p>
        <ul className="space-y-2">
          {byDate.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No subxeurons yet.
            </li>
          ) : (
            byDate.slice(0, TOP_N).map((s) => (
              <li key={s._id} className="overflow-hidden rounded-lg border border-border bg-card">
                <Link
                  href={`/x/${s.slug}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    {s.image_url && (
                      <AvatarImage src={toPublicImageUrl(s.image_url)} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
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
      </section>
    </main>
  )
}
