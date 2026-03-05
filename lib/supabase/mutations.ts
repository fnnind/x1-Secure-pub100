import { createClient } from './server-client'
import { mapSubxeuron, mapPublication } from './mappers'
import type { AppSubxeuron, AppPublication, PublicationType } from './types'
import { uploadImageToS3 } from '@/lib/s3'
import { generateId } from '@/lib/utils/id'

export type ImageData = { base64: string; filename: string; contentType: string } | null

// Shared source URL allowlist used for both subxeurons and publications
const ALLOWED_SOURCE_HOSTS = [
  'doi.org',
  'arxiv.org',
  'nature.com',
  'pubmed.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'biorxiv.org',
  'medrxiv.org',
  'sciencedirect.com',
  'springer.com',
  'wiley.com',
  'ieee.org',
  'acm.org',
]

function validateSourceUrl(sourceUrl: string): string | null {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, '')
    if (!ALLOWED_SOURCE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return `Source URL host not allowed. Allowed: ${ALLOWED_SOURCE_HOSTS.join(', ')}`
    }
    return null
  } catch {
    return 'Invalid source URL'
  }
}

export async function createSubxeuron(
  name: string,
  moderatorId: string,
  imageData: ImageData,
  sourceUrl: string,
  customSlug?: string,
  customDescription?: string,
  pdfUrl?: string
): Promise<{ subxeuron: AppSubxeuron } | { error: string }> {
  // Validate source URL on the server — cannot be bypassed via direct Server Action call
  if (sourceUrl) {
    const urlError = validateSourceUrl(sourceUrl)
    if (urlError) return { error: urlError }
  }

  const supabase = await createClient()
  const slug = (customSlug ?? name.toLowerCase().replace(/\s+/g, '-')).slice(0, 200)

  const { data: existing } = await supabase
    .from('subxeuron')
    .select('id')
    .eq('title', name)
    .maybeSingle()
  if (existing) return { error: 'A subxeuron with this name already exists' }

  const { data: slugExists } = await supabase
    .from('subxeuron')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (slugExists) return { error: 'A subxeuron with this URL already exists' }

  const subxeuronId = generateId()

  let imageUrl: string | null = null
  if (imageData) {
    const result = await uploadImageToS3(
      imageData.base64.includes(',') ? imageData.base64 : `data:${imageData.contentType};base64,${imageData.base64}`,
      imageData.filename,
      'subxeurons',
      subxeuronId
    )
    if (!('error' in result)) imageUrl = result.url
  }

  const { data: row, error } = await supabase
    .from('subxeuron')
    .insert({
      id: subxeuronId,
      title: name,
      slug,
      description: customDescription ?? `Welcome to xeuron.com/x/${slug}`,
      moderator_id: moderatorId,
      source_url: sourceUrl,
      pdf_url: pdfUrl ?? null,
      image_url: imageUrl,
    })
    .select('id, title, slug, description, image_url, image_alt, created_at, moderator:user(id, username, email, image_url)')
    .single()

  if (error) return { error: error.message }
  const subxeuron = mapSubxeuron(row)
  if (!subxeuron) return { error: 'Failed to create subxeuron' }
  return { subxeuron }
}

export async function createPost(params: {
  title: string
  authorId: string
  subxeuronId?: string | null
  publicationId?: string | null
  eventId?: string | null
  body?: unknown
  imageUrl?: string | null
  imageAlt?: string | null
  id?: string
}) {
  const supabase = await createClient()
  const postId = params.id ?? generateId()
  const { data, error } = await supabase
    .from('post')
    .insert({
      id: postId,
      title: params.title,
      author_id: params.authorId,
      subxeuron_id: params.subxeuronId ?? null,
      publication_id: params.publicationId ?? null,
      event_id: params.eventId ?? null,
      body: params.body ?? null,
      image_url: params.imageUrl ?? null,
      image_alt: params.imageAlt ?? null,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { post: { _id: data.id } }
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('post')
    .update({
      is_deleted: true,
      title: '[DELETED POST]',
      body: [{ _type: 'block', _key: '1', children: [{ _type: 'span', _key: '1', text: '[DELETED CONTENTS]' }] }],
      image_url: null,
      image_alt: null,
    })
    .eq('id', postId)
  return error ? { error: error.message } : { success: true }
}

export async function addComment(params: {
  content: string
  postId: string
  userId: string
  parentCommentId?: string | null
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('comment')
    .insert({
      id: generateId(),
      content: params.content,
      post_id: params.postId,
      author_id: params.userId,
      parent_comment_id: params.parentCommentId ?? null,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { comment: { _id: data.id } }
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('comment')
    .update({ is_deleted: true, content: '[DELETED]' })
    .eq('id', commentId)
  return error ? { error: error.message } : { success: true }
}

// ─── Publication mutations ─────────────────────────────────────────────────────

const DOI_REGEX = /^10\.\d{4,}(\.\d+)*\/\S+/

export async function createPublication(params: {
  title: string
  slug: string
  description?: string
  abstract?: string
  publicationType: PublicationType
  sourceUrl?: string
  doi?: string
  publishedYear?: number
  imageData?: ImageData
  pdfUrl?: string
  creatorId: string
  initialAuthors?: Array<{
    userName: string
    affiliation?: string
    userId?: string
    isCorresponding?: boolean
  }>
}): Promise<{ publication: AppPublication } | { error: string }> {
  const supabase = await createClient()

  // Validate DOI format
  if (params.doi && !DOI_REGEX.test(params.doi)) {
    return { error: 'Invalid DOI format. Expected format: 10.XXXX/...' }
  }

  // Validate source URL host
  if (params.sourceUrl) {
    const urlError = validateSourceUrl(params.sourceUrl)
    if (urlError) return { error: urlError }
  }

  // Check slug uniqueness
  const { data: slugExists } = await supabase
    .from('publication')
    .select('id')
    .eq('slug', params.slug)
    .maybeSingle()
  if (slugExists) return { error: 'A publication with this URL slug already exists' }

  // Check DOI uniqueness
  if (params.doi) {
    const { data: doiExists } = await supabase
      .from('publication')
      .select('id, slug')
      .eq('doi', params.doi)
      .maybeSingle()
    if (doiExists) {
      return { error: `A publication with this DOI already exists at /p/${(doiExists as { slug: string }).slug}` }
    }
  }

  const pubId = generateId()

  // Upload cover image if provided
  let imageUrl: string | null = null
  if (params.imageData) {
    const dataUrl = params.imageData.base64.includes(',')
      ? params.imageData.base64
      : `data:${params.imageData.contentType};base64,${params.imageData.base64}`
    const result = await uploadImageToS3(dataUrl, params.imageData.filename, 'publications', pubId)
    if (!('error' in result)) imageUrl = result.url
  }

  const { data: row, error } = await supabase
    .from('publication')
    .insert({
      id: pubId,
      title: params.title,
      slug: params.slug,
      description: params.description ?? null,
      abstract: params.abstract ?? null,
      publication_type: params.publicationType,
      creator_id: params.creatorId,
      doi: params.doi ?? null,
      source_url: params.sourceUrl ?? null,
      published_year: params.publishedYear ?? null,
      pdf_url: params.pdfUrl ?? null,
      image_url: imageUrl,
    })
    .select(`
      id, title, slug, description, abstract, publication_type, status,
      published_year, doi, source_url, pdf_url, image_url, image_alt, created_at,
      creator:user(id, username, email, image_url),
      publication_author(id, author_name, affiliation, author_order, is_corresponding, user:user(id, username, email, image_url)),
      publication_tag(tag)
    `)
    .single()

  if (error) return { error: error.message }

  // Creator is always first author
  const authorsToInsert = [
    {
      id: generateId(),
      publication_id: pubId,
      user_id: params.creatorId,
      author_name: 'Creator', // will be overridden below with real username
      author_order: 1,
      is_corresponding: true,
    },
    ...(params.initialAuthors ?? []).map((a, i) => ({
      id: generateId(),
      publication_id: pubId,
      user_id: a.userId ?? null,
      author_name: a.userName,
      affiliation: a.affiliation ?? null,
      author_order: i + 2,
      is_corresponding: a.isCorresponding ?? false,
    })),
  ]

  // Fetch creator username for author record
  const { data: creatorRow } = await supabase
    .from('user')
    .select('username')
    .eq('id', params.creatorId)
    .single()
  if (creatorRow) authorsToInsert[0].author_name = (creatorRow as { username: string }).username

  await supabase.from('publication_author').insert(authorsToInsert)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publication = mapPublication(row as any)
  if (!publication) return { error: 'Failed to map publication' }
  return { publication }
}

export async function updatePublication(
  publicationId: string,
  userId: string,
  updates: Partial<{
    title: string
    description: string
    abstract: string
    doi: string
    sourceUrl: string
    publishedYear: number
    recordedVideoUrl: string
    fieldOfStudy: string
    status: 'draft' | 'published' | 'archived'
  }>
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = {}
  if (updates.title !== undefined) patch.title = updates.title
  if (updates.description !== undefined) patch.description = updates.description
  if (updates.abstract !== undefined) patch.abstract = updates.abstract
  if (updates.doi !== undefined) patch.doi = updates.doi
  if (updates.sourceUrl !== undefined) patch.source_url = updates.sourceUrl
  if (updates.publishedYear !== undefined) patch.published_year = updates.publishedYear
  if (updates.fieldOfStudy !== undefined) patch.field_of_study = updates.fieldOfStudy
  if (updates.status !== undefined) patch.status = updates.status
  patch.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('publication')
    .update(patch)
    .eq('id', publicationId)
    .eq('creator_id', userId)
  return error ? { error: error.message } : { success: true }
}

export async function deletePublication(publicationId: string, userId: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('publication')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', publicationId)
    .eq('creator_id', userId)
  return error ? { error: error.message } : { success: true }
}

export async function inviteCollaborator(params: {
  publicationId: string
  userId: string        // invitee
  invitedById: string   // must be publication creator
  role: 'co-author' | 'reviewer' | 'editor' | 'contributor'
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  // Verify inviter is publication creator
  const { data: pub } = await supabase
    .from('publication')
    .select('id')
    .eq('id', params.publicationId)
    .eq('creator_id', params.invitedById)
    .maybeSingle()
  if (!pub) return { error: 'Only the publication creator can invite collaborators' }

  const { error } = await supabase.from('publication_collaborator').insert({
    id: generateId(),
    publication_id: params.publicationId,
    user_id: params.userId,
    invited_by: params.invitedById,
    role: params.role,
    status: 'pending',
  })
  return error ? { error: error.message } : { success: true }
}

export async function respondToCollaboratorInvite(params: {
  publicationId: string
  userId: string
  accept: boolean
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('publication_collaborator')
    .update({
      status: params.accept ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('publication_id', params.publicationId)
    .eq('user_id', params.userId)
    .eq('status', 'pending')
  return error ? { error: error.message } : { success: true }
}

export async function linkPublicationToSubxeuron(params: {
  publicationId: string
  subxeuronId: string
  linkedById: string
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  // Authorization: must be publication creator/accepted-collaborator OR subxeuron moderator
  const [pubCheck, subCheck] = await Promise.all([
    supabase
      .from('publication')
      .select('creator_id')
      .eq('id', params.publicationId)
      .maybeSingle(),
    supabase
      .from('subxeuron')
      .select('moderator_id')
      .eq('id', params.subxeuronId)
      .maybeSingle(),
  ])

  const isPublicationCreator = (pubCheck.data as { creator_id: string } | null)?.creator_id === params.linkedById
  const isSubxeuronModerator = (subCheck.data as { moderator_id: string } | null)?.moderator_id === params.linkedById

  if (!isPublicationCreator && !isSubxeuronModerator) {
    // Check accepted collaborator
    const { data: collab } = await supabase
      .from('publication_collaborator')
      .select('id')
      .eq('publication_id', params.publicationId)
      .eq('user_id', params.linkedById)
      .eq('status', 'accepted')
      .maybeSingle()
    if (!collab) return { error: 'Not authorized to link this publication to this subxeuron' }
  }

  const { error } = await supabase.from('publication_subxeuron').insert({
    id: generateId(),
    publication_id: params.publicationId,
    subxeuron_id: params.subxeuronId,
    linked_by: params.linkedById,
  })
  return error ? { error: error.message } : { success: true }
}

// ─── Event mutations ───────────────────────────────────────────────────────────

export async function createEvent(params: {
  publicationId?: string
  creatorId: string
  title: string
  slug: string
  description?: string
  eventType: string
  eventTypeCustom?: string
  venue?: string
  city?: string
  region?: string
  country?: string
  isVirtual?: boolean
  eventDate: string
  startDate?: string
  endDate?: string
  eventTime?: string
  timezone?: string
  conferenceUrl?: string
  linkedUrl?: string
}): Promise<{ event: { _id: string; slug: string; publicationId?: string | null } } | { error: string }> {
  const supabase = await createClient()

  // If linked to a publication, ensure creator is the pub creator or accepted collaborator
  if (params.publicationId) {
    const { data: pub } = await supabase
      .from('publication')
      .select('creator_id')
      .eq('id', params.publicationId)
      .maybeSingle()
    if (!pub) return { error: 'Publication not found' }

    const isCreator = (pub as { creator_id: string }).creator_id === params.creatorId
    if (!isCreator) {
      const { data: collab } = await supabase
        .from('publication_collaborator')
        .select('id')
        .eq('publication_id', params.publicationId)
        .eq('user_id', params.creatorId)
        .eq('status', 'accepted')
        .maybeSingle()
      if (!collab) return { error: 'Only the publication creator or an accepted collaborator can create events' }
    }
  }

  const eventId = generateId()
  const { data, error } = await supabase
    .from('event')
    .insert({
      id: eventId,
      publication_id: params.publicationId ?? null,
      creator_id: params.creatorId,
      title: params.title,
      slug: params.slug,
      description: params.description ?? null,
      event_type: params.eventType,
      event_type_custom: params.eventTypeCustom ?? null,
      venue: params.venue ?? null,
      city: params.city ?? null,
      region: params.region ?? null,
      country: params.country ?? null,
      is_virtual: params.isVirtual ?? false,
      event_date: params.eventDate,
      start_date: params.startDate ?? null,
      end_date: params.endDate ?? null,
      event_time: params.eventTime ?? null,
      timezone: params.timezone ?? 'UTC',
      conference_url: params.conferenceUrl ?? null,
      linked_url: params.linkedUrl ?? null,
    })
    .select('id, slug, publication_id')
    .single()

  if (error) return { error: error.message }
  return { event: { _id: data.id, slug: data.slug, publicationId: data.publication_id } }
}

export async function updateEvent(
  eventId: string,
  creatorId: string,
  updates: Partial<{
    title: string
    description: string
    recordedVideoUrl: string
    conferenceUrl: string
    linkedUrl: string
    venue: string
    city: string
    country: string
  }>
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = {}
  if (updates.title !== undefined) patch.title = updates.title
  if (updates.description !== undefined) patch.description = updates.description
  if (updates.recordedVideoUrl !== undefined) patch.recorded_video_url = updates.recordedVideoUrl
  if (updates.conferenceUrl !== undefined) patch.conference_url = updates.conferenceUrl
  if (updates.linkedUrl !== undefined) patch.linked_url = updates.linkedUrl
  if (updates.venue !== undefined) patch.venue = updates.venue
  if (updates.city !== undefined) patch.city = updates.city
  if (updates.country !== undefined) patch.country = updates.country
  patch.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('event')
    .update(patch)
    .eq('id', eventId)
    .eq('creator_id', creatorId)
  return error ? { error: error.message } : { success: true }
}

export async function addEventUrl(params: {
  eventId: string
  addedById: string
  urlType: string
  url: string
  label?: string
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('event_url').insert({
    id: generateId(),
    event_id: params.eventId,
    url_type: params.urlType,
    url: params.url,
    label: params.label ?? null,
    added_by: params.addedById,
  })
  return error ? { error: error.message } : { success: true }
}

export async function lockEventContent(params: {
  eventId: string
  creatorId: string
  target: 'qa' | 'poll' | 'both'
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const patch: Record<string, boolean> = {}
  if (params.target === 'qa' || params.target === 'both') patch.is_qa_locked = true
  if (params.target === 'poll' || params.target === 'both') patch.is_poll_locked = true

  const { error } = await supabase
    .from('event')
    .update(patch)
    .eq('id', params.eventId)
    .eq('creator_id', params.creatorId)
  return error ? { error: error.message } : { success: true }
}

// ─── Q&A mutations ─────────────────────────────────────────────────────────────

const MENTION_USERNAME_REGEX = /@([a-zA-Z0-9_]{3,30})/g
const MENTION_UUID_REGEX = /\/u\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi

async function insertMentions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourceType: 'event_question' | 'event_answer',
  sourceId: string,
  content: string,
  mentionerId: string
) {
  const usernames: string[] = []
  const uuids: string[] = []
  let m: RegExpExecArray | null
  const re1 = new RegExp(MENTION_USERNAME_REGEX.source, 'g')
  while ((m = re1.exec(content)) !== null) usernames.push(m[1])
  const re2 = new RegExp(MENTION_UUID_REGEX.source, 'gi')
  while ((m = re2.exec(content)) !== null) uuids.push(m[1])

  const mentionedIds = new Set<string>()
  if (usernames.length > 0) {
    const { data } = await supabase.from('user').select('id').in('username', usernames)
    data?.forEach((u) => mentionedIds.add((u as { id: string }).id))
  }
  uuids.forEach((id) => mentionedIds.add(id))
  mentionedIds.delete(mentionerId)

  if (mentionedIds.size === 0) return
  await supabase.from('mention').insert(
    [...mentionedIds].map((uid) => ({
      id: generateId(),
      source_type: sourceType,
      source_id: sourceId,
      mentioned_user_id: uid,
      mentioner_id: mentionerId,
    }))
  )
}

export async function createQuestion(params: {
  eventId: string
  authorId: string
  content: string
}): Promise<{ question: { _id: string } } | { error: string }> {
  const supabase = await createClient()

  // Check Q&A lock
  const { data: ev } = await supabase
    .from('event')
    .select('is_qa_locked, is_deleted')
    .eq('id', params.eventId)
    .maybeSingle()
  if (!ev) return { error: 'Event not found' }
  if ((ev as { is_deleted: boolean }).is_deleted) return { error: 'Event has been deleted' }
  if ((ev as { is_qa_locked: boolean }).is_qa_locked) return { error: 'Q&A is locked for this event' }

  const qId = generateId()
  const { error } = await supabase.from('event_question').insert({
    id: qId,
    event_id: params.eventId,
    author_id: params.authorId,
    content: params.content,
  })
  if (error) return { error: error.message }

  await insertMentions(supabase, 'event_question', qId, params.content, params.authorId)
  return { question: { _id: qId } }
}

export async function createAnswer(params: {
  questionId: string
  authorId: string
  content: string
}): Promise<{ answer: { _id: string } } | { error: string }> {
  const supabase = await createClient()

  // Get question and verify event Q&A not locked
  const { data: q } = await supabase
    .from('event_question')
    .select('id, event_id, is_deleted')
    .eq('id', params.questionId)
    .maybeSingle()
  if (!q) return { error: 'Question not found' }
  if ((q as { is_deleted: boolean }).is_deleted) return { error: 'Question has been deleted' }

  const { data: ev } = await supabase
    .from('event')
    .select('is_qa_locked')
    .eq('id', (q as { event_id: string }).event_id)
    .maybeSingle()
  if ((ev as { is_qa_locked: boolean } | null)?.is_qa_locked) return { error: 'Q&A is locked for this event' }

  const aId = generateId()
  const { error } = await supabase.from('event_answer').insert({
    id: aId,
    question_id: params.questionId,
    author_id: params.authorId,
    content: params.content,
  })
  if (error) return { error: error.message }

  await insertMentions(supabase, 'event_answer', aId, params.content, params.authorId)
  return { answer: { _id: aId } }
}

export async function voteOnQuestion(params: {
  questionId: string
  userId: string
  voteType: 'upvote' | 'downvote' | null // null = remove vote
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  if (params.voteType === null) {
    const { error } = await supabase
      .from('event_question_vote')
      .delete()
      .eq('question_id', params.questionId)
      .eq('user_id', params.userId)
    return error ? { error: error.message } : { success: true }
  }
  const { error } = await supabase.from('event_question_vote').upsert({
    id: generateId(),
    question_id: params.questionId,
    user_id: params.userId,
    vote_type: params.voteType,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'question_id,user_id', ignoreDuplicates: false })
  return error ? { error: error.message } : { success: true }
}

export async function voteOnAnswer(params: {
  answerId: string
  userId: string
  voteType: 'upvote' | 'downvote' | null
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  if (params.voteType === null) {
    const { error } = await supabase
      .from('event_answer_vote')
      .delete()
      .eq('answer_id', params.answerId)
      .eq('user_id', params.userId)
    return error ? { error: error.message } : { success: true }
  }
  const { error } = await supabase.from('event_answer_vote').upsert({
    id: generateId(),
    answer_id: params.answerId,
    user_id: params.userId,
    vote_type: params.voteType,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'answer_id,user_id', ignoreDuplicates: false })
  return error ? { error: error.message } : { success: true }
}

// ─── Poll mutations ────────────────────────────────────────────────────────────

export async function createPoll(params: {
  eventId: string
  creatorId: string
  question: string
  description?: string
  allowMultipleChoice?: boolean
  closesAt: string
  showResultsBeforeClose?: boolean
  options: string[]
}): Promise<{ poll: { _id: string } } | { error: string }> {
  const supabase = await createClient()

  // Verify creator is event creator
  const { data: ev } = await supabase
    .from('event')
    .select('creator_id, is_poll_locked')
    .eq('id', params.eventId)
    .maybeSingle()
  if (!ev) return { error: 'Event not found' }
  if ((ev as { creator_id: string }).creator_id !== params.creatorId)
    return { error: 'Only the event creator can create polls' }
  if ((ev as { is_poll_locked: boolean }).is_poll_locked)
    return { error: 'Polls are locked for this event' }
  if (params.options.length < 2) return { error: 'A poll must have at least 2 options' }

  const pollId = generateId()
  const { error: pollError } = await supabase.from('event_poll').insert({
    id: pollId,
    event_id: params.eventId,
    creator_id: params.creatorId,
    question: params.question,
    description: params.description ?? null,
    allow_multiple_choice: params.allowMultipleChoice ?? false,
    closes_at: params.closesAt,
    show_results_before_close: params.showResultsBeforeClose ?? true,
  })
  if (pollError) return { error: pollError.message }

  const optionRows = params.options.map((text, i) => ({
    id: generateId(),
    poll_id: pollId,
    option_text: text,
    option_order: i + 1,
  }))
  const { error: optError } = await supabase.from('event_poll_option').insert(optionRows)
  if (optError) return { error: optError.message }

  return { poll: { _id: pollId } }
}

export async function submitPollVote(params: {
  pollId: string
  optionIds: string[]
  userId: string
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const { data: poll } = await supabase
    .from('event_poll')
    .select('is_locked, closes_at, allow_multiple_choice')
    .eq('id', params.pollId)
    .maybeSingle()
  if (!poll) return { error: 'Poll not found' }

  const p = poll as { is_locked: boolean; closes_at: string; allow_multiple_choice: boolean }
  if (p.is_locked || new Date() >= new Date(p.closes_at))
    return { error: 'This poll is closed' }

  if (!p.allow_multiple_choice) {
    if (params.optionIds.length !== 1) return { error: 'This poll only allows a single choice' }
    const { data: existing } = await supabase
      .from('event_poll_vote')
      .select('id')
      .eq('poll_id', params.pollId)
      .eq('user_id', params.userId)
      .maybeSingle()
    if (existing) return { error: 'You have already voted in this poll' }
  }

  const voteRows = params.optionIds.map((optId) => ({
    id: generateId(),
    poll_id: params.pollId,
    option_id: optId,
    user_id: params.userId,
  }))
  const { error } = await supabase.from('event_poll_vote').insert(voteRows)
  return error ? { error: error.message } : { success: true }
}

export type ReportContentType = 'post' | 'comment' | 'publication' | 'subxeuron' | 'event'

export async function reportContent(
  contentType: ReportContentType,
  contentId: string,
): Promise<{ result?: boolean } | { error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('flag_content_as_reported', {
    p_content_type: contentType,
    p_content_id: contentId,
  })
  if (error) return { error: error.message }
  if (!data) return { error: 'Content not found' }
  return { result: data as boolean }
}
