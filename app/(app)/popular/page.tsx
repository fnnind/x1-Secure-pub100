import Link from 'next/link'
import { getSubxeurons, getSubxeuronsByIds, getSubxeuronsCount } from '@/lib/supabase/subxeurons'
import { getPublications, getPublicationsByIds, getPublicationsCount } from '@/lib/supabase/publications'
import { getPopularEntityIds, type TimePeriod } from '@/lib/supabase/analytics'
import { SubxeuronPublicationTwoRows } from '@/components/listings/SubxeuronPublicationTwoRows'

const PAGE_SIZE = 5
const VALID_PERIODS: TimePeriod[] = ['24h', '7d', '30d']
const PERIOD_LABELS: Record<TimePeriod, string> = { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days' }

export default async function PopularPage({
  searchParams,
}: {
  searchParams: Promise<{ subPage?: string; pubPage?: string; period?: string }>
}) {
  const params = await searchParams
  const subPage = Math.max(1, parseInt(params.subPage ?? '1', 10) || 1)
  const pubPage = Math.max(1, parseInt(params.pubPage ?? '1', 10) || 1)
  const period: TimePeriod = (VALID_PERIODS.includes(params.period as TimePeriod) ? params.period : '7d') as TimePeriod

  // Fetch popular entity IDs ranked by view count in the period
  const [popularSubIds, popularPubIds] = await Promise.all([
    getPopularEntityIds('subxeuron', period, 100),
    getPopularEntityIds('publication', period, 100),
  ])

  let subxeurons, publications, subTotal, pubTotal

  if (popularSubIds.length > 0 || popularPubIds.length > 0) {
    // Ranked by views: slice for current page, then fetch details
    const subSlice = popularSubIds.slice((subPage - 1) * PAGE_SIZE, subPage * PAGE_SIZE).map((e) => e.entityId)
    const pubSlice = popularPubIds.slice((pubPage - 1) * PAGE_SIZE, pubPage * PAGE_SIZE).map((e) => e.entityId)

    ;[subxeurons, publications, subTotal, pubTotal] = await Promise.all([
      subSlice.length ? getSubxeuronsByIds(subSlice) : getSubxeurons({ page: subPage, pageSize: PAGE_SIZE }),
      pubSlice.length ? getPublicationsByIds(pubSlice) : getPublications({ page: pubPage, pageSize: PAGE_SIZE }),
      Promise.resolve(popularSubIds.length || 0),
      Promise.resolve(popularPubIds.length || 0),
    ])
  } else {
    // No view data yet — fall back to most-recent
    ;[subxeurons, publications, subTotal, pubTotal] = await Promise.all([
      getSubxeurons({ page: subPage, pageSize: PAGE_SIZE }),
      getPublications({ page: pubPage, pageSize: PAGE_SIZE }),
      getSubxeuronsCount(),
      getPublicationsCount(),
    ])
  }

  const periodQuery = `&period=${period}`

  return (
    <div>
      {/* Period selector */}
      <div className="border-b border-border bg-muted/30 px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Trending:</span>
          {VALID_PERIODS.map((p) => (
            <Link
              key={p}
              href={`/popular?period=${p}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                p === period
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </div>

      <SubxeuronPublicationTwoRows
        subxeurons={subxeurons}
        publications={publications}
        subxeuronsTotal={subTotal}
        publicationsTotal={pubTotal}
        subPage={subPage}
        pubPage={pubPage}
        basePath={`/popular?period=${period}`}
        title={`Popular — ${PERIOD_LABELS[period]}`}
      />
    </div>
  )
}
