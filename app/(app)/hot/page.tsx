import { getSubxeurons, getSubxeuronsCount } from '@/lib/supabase/subxeurons'
import { getPublications, getPublicationsCount } from '@/lib/supabase/publications'
import { SubxeuronPublicationTwoRows } from '@/components/listings/SubxeuronPublicationTwoRows'

const PAGE_SIZE = 5

/**
 * Hot/Controversial: most recent SubXeurons and Publications (two rows, paginated).
 */
export default async function HotPage({
  searchParams,
}: {
  searchParams: Promise<{ subPage?: string; pubPage?: string }>
}) {
  const params = await searchParams
  const subPage = Math.max(1, parseInt(params.subPage ?? '1', 10) || 1)
  const pubPage = Math.max(1, parseInt(params.pubPage ?? '1', 10) || 1)

  const [subxeurons, publications, subTotal, pubTotal] = await Promise.all([
    getSubxeurons({ page: subPage, pageSize: PAGE_SIZE }),
    getPublications({ page: pubPage, pageSize: PAGE_SIZE }),
    getSubxeuronsCount(),
    getPublicationsCount(),
  ])

  return (
    <SubxeuronPublicationTwoRows
      subxeurons={subxeurons}
      publications={publications}
      subxeuronsTotal={subTotal}
      publicationsTotal={pubTotal}
      subPage={subPage}
      pubPage={pubPage}
      basePath="/hot"
      title="Hot / Controversial"
    />
  )
}
