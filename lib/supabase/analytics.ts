/**
 * Analytics / popularity service.
 * getPopularEntityIds uses the SECURITY DEFINER RPC so any client works.
 * getTotalViews / getEntityViewBreakdown query page_view directly and
 * require the service-role client (page_view RLS restricts direct reads).
 */
import { createClient } from './server'
import { getServiceClient } from './server-client'

export type TimePeriod = '24h' | '7d' | '30d'

export type PopularEntity = {
  entityId: string
  viewCount: number
}

function periodStart(period: TimePeriod): string {
  const now = new Date()
  const ms = period === '24h' ? 86_400_000 : period === '7d' ? 7 * 86_400_000 : 30 * 86_400_000
  return new Date(now.getTime() - ms).toISOString()
}

/**
 * Returns entity IDs sorted by view count for the given period and type.
 * Delegates to the get_popular_entities SECURITY DEFINER function so any
 * authenticated or anon client can call it — no service-role key needed.
 */
export async function getPopularEntityIds(
  entityType: 'subxeuron' | 'publication' | 'event' | 'post',
  period: TimePeriod,
  limit = 20
): Promise<PopularEntity[]> {
  const supabase = await createClient()
  const since = periodStart(period)

  const { data, error } = await supabase.rpc('get_popular_entities', {
    p_entity_type: entityType,
    p_since: since,
    p_limit: limit,
  })

  if (error || !data) return []

  return (data as { entity_id: string; view_count: number }[]).map((row) => ({
    entityId: row.entity_id,
    viewCount: Number(row.view_count),
  }))
}

/**
 * Total views for a single entity across all time.
 * Requires SUPABASE_SERVICE_ROLE_KEY (page_view RLS blocks direct reads).
 */
export async function getTotalViews(entityType: string, entityId: string): Promise<number> {
  const supabase = getServiceClient()
  const { count } = await supabase
    .from('page_view')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
  return count ?? 0
}

/**
 * Views for a single entity broken down by period.
 * Requires SUPABASE_SERVICE_ROLE_KEY (page_view RLS blocks direct reads).
 */
export async function getEntityViewBreakdown(
  entityType: string,
  entityId: string
): Promise<{ h24: number; d7: number; d30: number }> {
  const supabase = getServiceClient()
  const [r24, r7, r30] = await Promise.all([
    supabase
      .from('page_view')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .gte('created_at', periodStart('24h')),
    supabase
      .from('page_view')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .gte('created_at', periodStart('7d')),
    supabase
      .from('page_view')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .gte('created_at', periodStart('30d')),
  ])
  return { h24: r24.count ?? 0, d7: r7.count ?? 0, d30: r30.count ?? 0 }
}
