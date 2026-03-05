import { createClient } from './server'
import { mapEvent } from './mappers'
import type { AppEvent } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any

const eventSelect = `
  id, publication_id, title, slug, description,
  event_type, event_type_custom,
  venue, city, region, country, is_virtual,
  event_date, start_date, end_date, event_time, timezone,
  conference_url, recorded_video_url, linked_url,
  is_qa_locked, is_poll_locked, created_at,
  creator:user(id, username, email, image_url),
  publication:publication(slug, title),
  event_url(id, url_type, url, label, added_by_user:user(id, username, email, image_url))
`.trim()

/** Events favorited by the given user. Default sort: most recent (favorite created_at desc). */
export async function getEventsFavoritedByUser(userId: string): Promise<AppEvent[]> {
  const supabase = await createClient()
  const { data: favRows } = await supabase
    .from('event_favorite')
    .select('event_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (!favRows?.length) return []

  const eventIds = (favRows as { event_id: string }[]).map((r) => r.event_id)
  const { data: events } = await supabase
    .from('event')
    .select(eventSelect)
    .in('id', eventIds)
    .eq('is_deleted', false)
  if (!events?.length) return []

  const byId = new Map((events as AnyRow[]).map((row) => [row.id, mapEvent(row)]))
  return eventIds.map((id) => byId.get(id)).filter(Boolean) as AppEvent[]
}

export async function addEventFavorite(userId: string, eventId: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('event_favorite').insert({ user_id: userId, event_id: eventId })
  if (error) {
    if (error.code === '23505') return { success: true }
    return { error: error.message }
  }
  return { success: true }
}

export async function removeEventFavorite(userId: string, eventId: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('event_favorite').delete().eq('user_id', userId).eq('event_id', eventId)
  return error ? { error: error.message } : { success: true }
}

export async function isEventFavoritedByUser(userId: string, eventId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_favorite')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle()
  return !!data
}
