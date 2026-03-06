/**
 * App-facing shapes (camelCase, _id). Mapped from Supabase snake_case / id in the data layer.
 */

export type UserCategory =
  | 'researcher'
  | 'academic'
  | 'industry_professional'
  | 'independent_scientist'
  | 'builder'
  | 'engineer'
  | 'professional'
  | 'curiosity'
  | 'intellect'
  | 'other'

export type AppUser = {
  _id: string
  username: string
  email?: string
  imageUrl?: string | null
  // Extended profile fields — populated only by mapUserFull (getUserByUsername)
  firstName?: string | null
  lastName?: string | null
  nickname?: string | null
  interests?: string[]
  expertise?: string[]
  category?: UserCategory | null
  innovationSummary?: string | null
  isProfilePublic?: boolean
}

export type AppSubxeuron = {
  _id: string
  title: string
  slug: string
  description?: string | null
  moderator?: AppUser | null
  image_url?: string | null
  image_alt?: string | null
  pdf_url?: string | null
  source_url?: string | null
  created_at?: string
}

export type BlockChild = { _type: 'span'; _key: string; text?: string; marks?: string[] }
export type Block = {
  _type: 'block'
  _key: string
  children?: BlockChild[]
  style?: string
}

export type AppPost = {
  _id: string
  title: string
  body?: Block[] | null
  publishedAt?: string | null
  author?: AppUser | null
  subxeuron?: AppSubxeuron | null
  /** Optional convenience shape from mapper (url, alt). Prefer image_url / image_alt for display. */
  image?: { url?: string; alt?: string } | null
  image_url?: string | null
  image_alt?: string | null
  isDeleted?: boolean
  upvotes?: number
  downvotes?: number
  netScore?: number
  commentCount?: number
}

export type AppComment = {
  _id: string
  content: string
  createdAt?: string | null
  author?: AppUser | null
  replies?: AppComment[]
  votes: { upvotes: number; downvotes: number; netScore: number; voteStatus: 'upvote' | 'downvote' | null }
}

export type VoteCounts = { upvotes: number; downvotes: number; netScore: number }

// ─── Publication ─────────────────────────────────────────────────────────────

export type PublicationType =
  | 'journal_article'
  | 'preprint'
  | 'conference_paper'
  | 'book_chapter'
  | 'thesis'
  | 'whitepaper'
  | 'technical_report'
  | 'other'

export type AppPublication = {
  _id: string
  title: string
  slug: string
  description?: string | null
  abstract?: string | null
  fieldOfStudy?: string | null
  creator?: AppUser | null
  publicationType: PublicationType
  status: 'draft' | 'published' | 'archived'
  publishedYear?: number | null
  doi?: string | null
  source_url?: string | null
  pdf_url?: string | null
  image_url?: string | null
  image_alt?: string | null
  authors?: AppPublicationAuthor[]
  collaborators?: AppPublicationCollaborator[]
  linkedSubxeurons?: AppSubxeuron[]
  tags?: string[]
  created_at?: string
}

export type AppPublicationAuthor = {
  _id: string
  user?: AppUser | null
  authorName: string
  affiliation?: string | null
  authorOrder: number
  isCorresponding: boolean
}

export type AppPublicationCollaborator = {
  _id: string
  user: AppUser
  invitedBy: AppUser
  role: 'co-author' | 'reviewer' | 'editor' | 'contributor'
  status: 'pending' | 'accepted' | 'declined'
  invitedAt: string
}

// ─── Event ───────────────────────────────────────────────────────────────────

export type EventType =
  | 'conference'
  | 'meetup'
  | 'presentation'
  | 'zoom'
  | 'webinar'
  | 'workshop'
  | 'symposium'
  | 'seminar'
  | 'poster_session'
  | 'panel'
  | 'other'

export type AppEvent = {
  _id: string
  publicationId?: string | null
  /** When event is linked to a publication, for building /p/[slug]/events/[id] */
  publicationSlug?: string | null
  publicationTitle?: string | null
  creator?: AppUser | null
  title: string
  slug: string
  description?: string | null
  eventType: EventType
  eventTypeCustom?: string | null
  venue?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  isVirtual: boolean
  eventDate: string
  startDate?: string | null
  endDate?: string | null
  eventTime?: string | null
  timezone: string
  conferenceUrl?: string | null
  recordedVideoUrl?: string | null
  linkedUrl?: string | null
  isQaLocked: boolean
  isPollLocked: boolean
  urls?: AppEventUrl[]
  created_at: string
}

export type AppEventUrl = {
  _id: string
  urlType: string
  url: string
  label?: string | null
  addedBy?: AppUser | null
}

export type AppEventQuestion = {
  _id: string
  content: string
  author?: AppUser | null
  isPinned: boolean
  isDeleted: boolean
  votes: { upvotes: number; downvotes: number; netScore: number; voteStatus: 'upvote' | 'downvote' | null }
  answers?: AppEventAnswer[]
  createdAt: string
}

export type AppEventAnswer = {
  _id: string
  content: string
  author?: AppUser | null
  isAccepted: boolean
  votes: { upvotes: number; downvotes: number; netScore: number; voteStatus: 'upvote' | 'downvote' | null }
  createdAt: string
}

export type AppPoll = {
  _id: string
  question: string
  description?: string | null
  allowMultipleChoice: boolean
  closesAt: string
  isLocked: boolean
  isClosed: boolean
  showResultsBeforeClose: boolean
  options: AppPollOption[]
  totalVotes: number
  userVotedOptionIds?: string[]
}

export type AppPollOption = {
  _id: string
  optionText: string
  optionOrder: number
  voteCount: number
  percentage: number
}
