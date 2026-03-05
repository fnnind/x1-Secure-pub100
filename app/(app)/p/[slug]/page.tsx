import { notFound } from 'next/navigation'
import { getPublicationBySlug } from '@/lib/supabase/publications'
import { getUser } from '@/lib/supabase/user'
import { getPublicationCommentCount } from '@/lib/supabase/publication-comments'
import { getEventsForPublication } from '@/lib/supabase/events'
import { PublicationBanner } from '@/components/publication/PublicationBanner'
import { PublicationAISummary } from '@/components/publication/PublicationAISummary'
import { PublicationTabs, type PubTab } from '@/components/publication/PublicationTabs'
import { PapersTab } from '@/components/publication/tabs/PapersTab'
import { EventsTab } from '@/components/publication/tabs/EventsTab'
import { QATab } from '@/components/publication/tabs/QATab'
import { DetailsTab } from '@/components/publication/tabs/DetailsTab'
import { ReferencesTab } from '@/components/publication/tabs/ReferencesTab'

const VALID_TABS: PubTab[] = ['papers', 'events', 'qa', 'details', 'references']

export default async function PublicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])

  const rawTab = sp.tab ?? 'papers'
  const activeTab: PubTab = VALID_TABS.includes(rawTab as PubTab)
    ? (rawTab as PubTab)
    : 'papers'

  const publication = await getPublicationBySlug(slug)
  if (!publication) notFound()

  const user = await getUser()
  const userId = 'error' in user ? null : user._id
  const isCreator = userId === publication.creator?._id

  // Parallel: comment count + event count for tab badges
  const [commentCount, events] = await Promise.all([
    getPublicationCommentCount(publication._id),
    getEventsForPublication(publication._id),
  ])

  return (
    <>
      <PublicationBanner publication={publication} userId={userId} />
      <PublicationAISummary abstract={publication.abstract} />
      <PublicationTabs
        activeTab={activeTab}
        slug={slug}
        commentCount={commentCount}
        eventCount={events.length}
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {activeTab === 'papers' && (
          <PapersTab publicationId={publication._id} publicationSlug={slug} userId={userId} />
        )}
        {activeTab === 'events' && (
          <EventsTab
            publicationId={publication._id}
            slug={slug}
            userId={userId}
            isCreator={isCreator}
          />
        )}
        {activeTab === 'qa' && (
          <QATab publicationId={publication._id} userId={userId} />
        )}
        {activeTab === 'details' && (
          <DetailsTab publication={publication} isCreator={isCreator} />
        )}
        {activeTab === 'references' && (
          <ReferencesTab publication={publication} />
        )}
      </div>
    </>
  )
}
