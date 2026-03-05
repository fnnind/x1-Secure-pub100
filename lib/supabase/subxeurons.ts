import { createClient } from './server'
import { mapSubxeuron } from './mappers'
import type { AppSubxeuron } from './types'

const subxeuronSelect =
  'id, title, slug, description, image_url, image_alt, pdf_url, source_url, created_at, moderator:user(id, username, email, image_url)'

export type SubxeuronSort = 'created_at' | 'title'

/**
 * Fetch subxeurons. Optional pagination and sort. Default: most recent first.
 */
export async function getSubxeurons(options?: {
  page?: number
  pageSize?: number
  limit?: number
  sortBy?: SubxeuronSort
  ascending?: boolean
}): Promise<AppSubxeuron[]> {
  const supabase = await createClient()
  const sortBy = options?.sortBy ?? 'created_at'
  const ascending = options?.ascending ?? false
  let query = supabase
    .from('subxeuron')
    .select(subxeuronSelect)
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
  return data.map((row) => mapSubxeuron(row)!)
}

/** Total count of subxeurons (for pagination). */
export async function getSubxeuronsCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase.from('subxeuron').select('id', { count: 'exact', head: true })
  return count ?? 0
}

export async function getSubxeuronBySlug(slug: string): Promise<AppSubxeuron | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subxeuron')
    .select(subxeuronSelect)
    .eq('slug', slug.toLowerCase())
    .maybeSingle()
  return mapSubxeuron(data)
}

export async function getSubxeuronsByIds(ids: string[]): Promise<AppSubxeuron[]> {
  if (!ids.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('subxeuron')
    .select(subxeuronSelect)
    .in('id', ids)
  if (!data?.length) return []
  // Preserve order from ids array
  const map = new Map(data.map((r) => [r.id as string, r]))
  return ids.map((id) => mapSubxeuron(map.get(id))!).filter(Boolean)
}

export async function searchSubxeurons(searchTerm: string): Promise<AppSubxeuron[]> {
  if (!searchTerm?.trim()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('subxeuron')
    .select(subxeuronSelect)
    .textSearch('search_vector', searchTerm.trim(), { type: 'websearch', config: 'english' })
    .order('created_at', { ascending: false })
  if (!data?.length) return []
  return data.map((row) => mapSubxeuron(row)!)
}
