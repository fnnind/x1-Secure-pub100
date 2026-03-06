import type {
  AppUser, AppSubxeuron, AppPost, AppComment,
  AppPublication, AppPublicationAuthor, AppPublicationCollaborator,
  AppEvent, AppEventUrl, AppEventQuestion, AppEventAnswer,
  AppPoll, AppPollOption,
  PublicationType, EventType, UserCategory,
} from './types'

type DbUser = { id: string; username: string; email?: string; image_url?: string | null }

type DbUserFull = DbUser & {
  first_name?: string | null
  last_name?: string | null
  nickname?: string | null
  interests?: string[] | null
  expertise?: string[] | null
  category?: string | null
  innovation_summary?: string | null
  is_profile_public?: boolean | null
}
type DbSubxeuron = {
  id: string
  title: string
  slug: string
  description?: string | null
  image_url?: string | null
  image_alt?: string | null
  pdf_url?: string | null
  source_url?: string | null
  created_at?: string
  moderator?: DbUser | null
}
type DbPost = {
  id: string
  title: string
  body?: unknown
  published_at?: string
  image_url?: string | null
  image_alt?: string | null
  is_deleted?: boolean
  author?: DbUser | null
  subxeuron?: DbSubxeuron | null
}
type DbComment = {
  id: string
  content: string
  created_at?: string
  author?: DbUser | null
}

export function mapUser(r: DbUser | null | undefined): AppUser | null {
  if (!r) return null
  return {
    _id: r.id,
    username: r.username,
    email: r.email,
    imageUrl: r.image_url ?? undefined,
  }
}

export function mapUserFull(r: DbUserFull | null | undefined): AppUser | null {
  if (!r) return null
  return {
    _id: r.id,
    username: r.username,
    email: r.email,
    imageUrl: r.image_url ?? undefined,
    firstName: r.first_name ?? null,
    lastName: r.last_name ?? null,
    nickname: r.nickname ?? null,
    interests: r.interests ?? [],
    expertise: r.expertise ?? [],
    category: (r.category as UserCategory) ?? null,
    innovationSummary: r.innovation_summary ?? null,
    isProfilePublic: r.is_profile_public ?? false,
  }
}

export function mapSubxeuron(r: DbSubxeuron | null | undefined): AppSubxeuron | null {
  if (!r) return null
  return {
    _id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description ?? undefined,
    moderator: mapUser(r.moderator) ?? undefined,
    image_url: r.image_url ?? undefined,
    image_alt: r.image_alt ?? undefined,
    pdf_url: r.pdf_url ?? undefined,
    source_url: r.source_url ?? undefined,
    created_at: r.created_at,
  }
}

export function mapPost(r: DbPost | null | undefined, extra?: { upvotes?: number; downvotes?: number; netScore?: number; commentCount?: number }): AppPost | null {
  if (!r) return null
  const sub = mapSubxeuron(r.subxeuron)
  return {
    _id: r.id,
    title: r.title,
    body: (r.body as AppPost['body']) ?? undefined,
    publishedAt: r.published_at ?? undefined,
    author: mapUser(r.author) ?? undefined,
    subxeuron: sub ?? undefined,
    image: r.image_url ? { url: r.image_url, alt: r.image_alt ?? undefined } : undefined,
    image_url: r.image_url ?? undefined,
    image_alt: r.image_alt ?? undefined,
    isDeleted: r.is_deleted ?? undefined,
    ...extra,
  }
}

export function mapComment(
  r: DbComment | null | undefined,
  votes: { upvotes: number; downvotes: number; netScore: number; voteStatus: 'upvote' | 'downvote' | null }
): AppComment | null {
  if (!r) return null
  return {
    _id: r.id,
    content: r.content,
    createdAt: r.created_at ?? undefined,
    author: mapUser(r.author) ?? undefined,
    votes,
  }
}

// ─── Publication mappers ──────────────────────────────────────────────────────

type DbPublicationAuthor = {
  id: string
  author_name: string
  affiliation?: string | null
  author_order: number
  is_corresponding: boolean
  user?: DbUser | null
}

type DbPublicationCollaborator = {
  id: string
  role: string
  status: string
  invited_at: string
  user?: DbUser | null
  inviter?: DbUser | null
}

type DbPublication = {
  id: string
  title: string
  slug: string
  description?: string | null
  abstract?: string | null
  field_of_study?: string | null
  publication_type: string
  status: string
  published_year?: number | null
  doi?: string | null
  source_url?: string | null
  pdf_url?: string | null
  image_url?: string | null
  image_alt?: string | null
  created_at?: string
  creator?: DbUser | null
  publication_author?: DbPublicationAuthor[]
  publication_collaborator?: DbPublicationCollaborator[]
  publication_tag?: { tag: string }[]
}

export function mapPublicationAuthor(r: DbPublicationAuthor | null | undefined): AppPublicationAuthor | null {
  if (!r) return null
  return {
    _id: r.id,
    user: mapUser(r.user) ?? undefined,
    authorName: r.author_name,
    affiliation: r.affiliation ?? undefined,
    authorOrder: r.author_order,
    isCorresponding: r.is_corresponding,
  }
}

export function mapPublicationCollaborator(r: DbPublicationCollaborator | null | undefined): AppPublicationCollaborator | null {
  if (!r || !r.user) return null
  const user = mapUser(r.user)
  const invitedBy = mapUser(r.inviter)
  if (!user || !invitedBy) return null
  return {
    _id: r.id,
    user,
    invitedBy,
    role: r.role as AppPublicationCollaborator['role'],
    status: r.status as AppPublicationCollaborator['status'],
    invitedAt: r.invited_at,
  }
}

export function mapPublication(r: DbPublication | null | undefined): AppPublication | null {
  if (!r) return null
  return {
    _id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description ?? undefined,
    abstract: r.abstract ?? undefined,
    fieldOfStudy: r.field_of_study ?? undefined,
    creator: mapUser(r.creator) ?? undefined,
    publicationType: r.publication_type as PublicationType,
    status: r.status as AppPublication['status'],
    publishedYear: r.published_year ?? undefined,
    doi: r.doi ?? undefined,
    source_url: r.source_url ?? undefined,
    pdf_url: r.pdf_url ?? undefined,
    image_url: r.image_url ?? undefined,
    image_alt: r.image_alt ?? undefined,
    authors: r.publication_author?.map((a) => mapPublicationAuthor(a)!).filter(Boolean) ?? [],
    collaborators: r.publication_collaborator?.map((c) => mapPublicationCollaborator(c)!).filter(Boolean) ?? [],
    tags: r.publication_tag?.map((t) => t.tag) ?? [],
    created_at: r.created_at,
  }
}

// ─── Event mappers ────────────────────────────────────────────────────────────

type DbEventUrl = {
  id: string
  url_type: string
  url: string
  label?: string | null
  added_by_user?: DbUser | null
}

type DbEvent = {
  id: string
  publication_id?: string | null
  title: string
  slug: string
  description?: string | null
  event_type: string
  event_type_custom?: string | null
  venue?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  is_virtual: boolean
  event_date: string
  start_date?: string | null
  end_date?: string | null
  event_time?: string | null
  timezone: string
  conference_url?: string | null
  recorded_video_url?: string | null
  linked_url?: string | null
  is_qa_locked: boolean
  is_poll_locked: boolean
  created_at: string
  creator?: DbUser | null
  publication?: { slug: string; title?: string } | null
  event_url?: DbEventUrl[]
}

export function mapEventUrl(r: DbEventUrl | null | undefined): AppEventUrl | null {
  if (!r) return null
  return {
    _id: r.id,
    urlType: r.url_type,
    url: r.url,
    label: r.label ?? undefined,
    addedBy: mapUser(r.added_by_user) ?? undefined,
  }
}

export function mapEvent(r: DbEvent | null | undefined): AppEvent | null {
  if (!r) return null
  return {
    _id: r.id,
    publicationId: r.publication_id ?? undefined,
    publicationSlug: r.publication?.slug ?? undefined,
    publicationTitle: r.publication?.title ?? undefined,
    creator: mapUser(r.creator) ?? undefined,
    title: r.title,
    slug: r.slug,
    description: r.description ?? undefined,
    eventType: r.event_type as EventType,
    eventTypeCustom: r.event_type_custom ?? undefined,
    venue: r.venue ?? undefined,
    city: r.city ?? undefined,
    region: r.region ?? undefined,
    country: r.country ?? undefined,
    isVirtual: r.is_virtual,
    eventDate: r.event_date,
    startDate: r.start_date ?? undefined,
    endDate: r.end_date ?? undefined,
    eventTime: r.event_time ?? undefined,
    timezone: r.timezone,
    conferenceUrl: r.conference_url ?? undefined,
    recordedVideoUrl: r.recorded_video_url ?? undefined,
    linkedUrl: r.linked_url ?? undefined,
    isQaLocked: r.is_qa_locked,
    isPollLocked: r.is_poll_locked,
    urls: r.event_url?.map((u) => mapEventUrl(u)!).filter(Boolean) ?? [],
    created_at: r.created_at,
  }
}

type DbEventQuestion = {
  id: string
  content: string
  is_pinned: boolean
  is_deleted: boolean
  created_at: string
  author?: DbUser | null
  upvotes?: number
  downvotes?: number
  voteStatus?: 'upvote' | 'downvote' | null
}

export function mapEventQuestion(
  r: DbEventQuestion | null | undefined,
  votes: { upvotes: number; downvotes: number; netScore: number; voteStatus: 'upvote' | 'downvote' | null }
): AppEventQuestion | null {
  if (!r) return null
  return {
    _id: r.id,
    content: r.content,
    author: mapUser(r.author) ?? undefined,
    isPinned: r.is_pinned,
    isDeleted: r.is_deleted,
    votes,
    createdAt: r.created_at,
  }
}

type DbEventAnswer = {
  id: string
  content: string
  is_accepted: boolean
  is_deleted: boolean
  created_at: string
  author?: DbUser | null
}

export function mapEventAnswer(
  r: DbEventAnswer | null | undefined,
  votes: { upvotes: number; downvotes: number; netScore: number; voteStatus: 'upvote' | 'downvote' | null }
): AppEventAnswer | null {
  if (!r) return null
  return {
    _id: r.id,
    content: r.content,
    author: mapUser(r.author) ?? undefined,
    isAccepted: r.is_accepted,
    votes,
    createdAt: r.created_at,
  }
}

type DbPollOption = {
  id: string
  option_text: string
  option_order: number
  voteCount?: number
}

type DbPoll = {
  id: string
  question: string
  description?: string | null
  allow_multiple_choice: boolean
  closes_at: string
  is_locked: boolean
  show_results_before_close: boolean
  event_poll_option?: DbPollOption[]
}

export function mapPoll(
  r: DbPoll | null | undefined,
  totalVotes: number,
  userVotedOptionIds?: string[]
): AppPoll | null {
  if (!r) return null
  const isClosed = r.is_locked || new Date() >= new Date(r.closes_at)
  const options: AppPollOption[] = (r.event_poll_option ?? []).map((o) => ({
    _id: o.id,
    optionText: o.option_text,
    optionOrder: o.option_order,
    voteCount: o.voteCount ?? 0,
    percentage: totalVotes > 0 ? Math.round(((o.voteCount ?? 0) / totalVotes) * 100) : 0,
  }))
  return {
    _id: r.id,
    question: r.question,
    description: r.description ?? undefined,
    allowMultipleChoice: r.allow_multiple_choice,
    closesAt: r.closes_at,
    isLocked: r.is_locked,
    isClosed,
    showResultsBeforeClose: r.show_results_before_close,
    options,
    totalVotes,
    userVotedOptionIds: userVotedOptionIds ?? [],
  }
}
