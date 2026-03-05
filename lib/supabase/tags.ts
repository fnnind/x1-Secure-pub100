/**
 * Tag service for subxeurons and events.
 * Publications already have publication_tag — use the same pattern.
 */
import { createClient } from './server'
import { generateId } from '@/lib/utils/id'

// ─── Subxeuron tags ───────────────────────────────────────────────────────────

export async function getSubxeuronTags(subxeuronId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subxeuron_tag')
    .select('tag')
    .eq('subxeuron_id', subxeuronId)
    .order('tag')
  return (data ?? []).map((r: { tag: string }) => r.tag)
}

export async function addSubxeuronTag(
  subxeuronId: string,
  tag: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const normalised = tag.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 50)
  if (!normalised) return { error: 'Tag cannot be empty' }
  const { error } = await supabase.from('subxeuron_tag').insert({
    id: generateId(),
    subxeuron_id: subxeuronId,
    tag: normalised,
  })
  if (error?.code === '23505') return { error: 'Tag already exists' }
  return error ? { error: error.message } : { ok: true }
}

export async function removeSubxeuronTag(
  subxeuronId: string,
  tag: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('subxeuron_tag')
    .delete()
    .eq('subxeuron_id', subxeuronId)
    .eq('tag', tag)
  return error ? { error: error.message } : { ok: true }
}

/** Find subxeurons whose tags match any of the given terms. */
export async function searchSubxeuronsByTag(term: string): Promise<{ subxeuronId: string; tags: string[] }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subxeuron_tag')
    .select('subxeuron_id, tag')
    .ilike('tag', `%${term.toLowerCase()}%`)
    .limit(50)
  if (!data?.length) return []

  const grouped = new Map<string, string[]>()
  for (const row of data as { subxeuron_id: string; tag: string }[]) {
    const existing = grouped.get(row.subxeuron_id) ?? []
    existing.push(row.tag)
    grouped.set(row.subxeuron_id, existing)
  }
  return [...grouped.entries()].map(([subxeuronId, tags]) => ({ subxeuronId, tags }))
}

// ─── Event tags ───────────────────────────────────────────────────────────────

export async function getEventTags(eventId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_tag')
    .select('tag')
    .eq('event_id', eventId)
    .order('tag')
  return (data ?? []).map((r: { tag: string }) => r.tag)
}

export async function addEventTag(
  eventId: string,
  tag: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const normalised = tag.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 50)
  if (!normalised) return { error: 'Tag cannot be empty' }
  const { error } = await supabase.from('event_tag').insert({
    id: generateId(),
    event_id: eventId,
    tag: normalised,
  })
  if (error?.code === '23505') return { error: 'Tag already exists' }
  return error ? { error: error.message } : { ok: true }
}

export async function removeEventTag(
  eventId: string,
  tag: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('event_tag')
    .delete()
    .eq('event_id', eventId)
    .eq('tag', tag)
  return error ? { error: error.message } : { ok: true }
}

/** Find events whose tags match the given term. */
export async function searchEventsByTag(term: string): Promise<{ eventId: string; tags: string[] }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_tag')
    .select('event_id, tag')
    .ilike('tag', `%${term.toLowerCase()}%`)
    .limit(50)
  if (!data?.length) return []

  const grouped = new Map<string, string[]>()
  for (const row of data as { event_id: string; tag: string }[]) {
    const existing = grouped.get(row.event_id) ?? []
    existing.push(row.tag)
    grouped.set(row.event_id, existing)
  }
  return [...grouped.entries()].map(([eventId, tags]) => ({ eventId, tags }))
}
