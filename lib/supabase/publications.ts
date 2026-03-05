import { createClient } from './server'
import { mapPublication } from './mappers'
import type { AppPublication } from './types'

const publicationSelect = `
  id, title, slug, description, abstract, field_of_study, publication_type, status,
  published_year, doi, source_url, pdf_url, image_url, image_alt, created_at,
  creator:user(id, username, email, image_url),
  publication_author(id, author_name, affiliation, author_order, is_corresponding, user:user(id, username, email, image_url)),
  publication_tag(tag)
`.trim()

type AnyRow = Parameters<typeof mapPublication>[0]

export type PublicationSort = 'created_at' | 'title' | 'published_year'

/**
 * Fetch publications (non-deleted). Optional pagination and sort. Default: most recent first.
 */
export async function getPublications(options?: {
  page?: number
  pageSize?: number
  limit?: number
  sortBy?: PublicationSort
  ascending?: boolean
}): Promise<AppPublication[]> {
  const supabase = await createClient()
  const sortBy = options?.sortBy ?? 'created_at'
  const ascending = options?.ascending ?? false
  let query = supabase
    .from('publication')
    .select(publicationSelect)
    .eq('is_deleted', false)
    .order(sortBy, { ascending })
  if (options?.limit != null && options.limit > 0) {
    query = query.limit(options.limit)
  } else if (options?.pageSize != null && options.pageSize > 0) {
    const page = Math.max(1, options.page ?? 1)
    const from = (page - 1) * options.pageSize
    query = query.range(from, from + options.pageSize - 1)
  }
  const { data } = await query
  if (!data?.length) return []
  return (data as unknown as AnyRow[]).map((row) => mapPublication(row)!).filter(Boolean)
}

/** Total count of non-deleted publications (for pagination). */
export async function getPublicationsCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('publication')
    .select('id', { count: 'exact', head: true })
    .eq('is_deleted', false)
  return count ?? 0
}

export async function getPublicationBySlug(slug: string): Promise<AppPublication | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('publication')
    .select(publicationSelect)
    .eq('slug', slug.toLowerCase())
    .eq('is_deleted', false)
    .maybeSingle()
  return mapPublication(data as unknown as AnyRow)
}

export async function getPublicationById(id: string): Promise<AppPublication | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('publication')
    .select(publicationSelect)
    .eq('id', id)
    .maybeSingle()
  return mapPublication(data as unknown as AnyRow)
}

export async function getPublicationsByIds(ids: string[]): Promise<AppPublication[]> {
  if (!ids.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('publication')
    .select(publicationSelect)
    .in('id', ids)
    .eq('is_deleted', false)
  if (!data?.length) return []
  const map = new Map((data as unknown as (AnyRow & { id: string })[]).map((r) => [r.id, r]))
  return ids.map((id) => mapPublication(map.get(id) as AnyRow)!).filter(Boolean)
}

export async function searchPublications(searchTerm: string): Promise<AppPublication[]> {
  if (!searchTerm?.trim()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('publication')
    .select(publicationSelect)
    .eq('is_deleted', false)
    .textSearch('search_vector', searchTerm.trim(), { type: 'websearch', config: 'english' })
    .order('created_at', { ascending: false })
  if (!data?.length) return []
  return (data as unknown as AnyRow[]).map((row) => mapPublication(row)!).filter(Boolean)
}

export async function getPublicationsByCreator(creatorId: string): Promise<AppPublication[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('publication')
    .select(publicationSelect)
    .eq('creator_id', creatorId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (!data?.length) return []
  return (data as unknown as AnyRow[]).map((row) => mapPublication(row)!).filter(Boolean)
}

export async function getPublicationsForSubxeuron(subxeuronId: string): Promise<AppPublication[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('publication_subxeuron')
    .select('publication_id')
    .eq('subxeuron_id', subxeuronId)
  if (!data?.length) return []

  const pubIds = (data as { publication_id: string }[]).map((r) => r.publication_id)
  const { data: pubs } = await supabase
    .from('publication')
    .select(publicationSelect)
    .in('id', pubIds)
    .eq('is_deleted', false)
  if (!pubs?.length) return []
  return (pubs as unknown as AnyRow[]).map((row) => mapPublication(row)!).filter(Boolean)
}
