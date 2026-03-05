import {getServiceClient} from '@/lib/supabase/server-client'

/**
 * Check whether a key has exceeded its rate limit.
 *
 * @param key           Opaque identifier, e.g. `votes:${userId}` or `track:${ip}`
 * @param windowSeconds Fixed window size in seconds
 * @param maxCount      Maximum allowed calls within the window
 * @returns true  = request is allowed
 *          false = caller is over the limit (caller should return 429)
 *
 * Fails *open* on DB errors so a Supabase hiccup never blocks legitimate users.
 */
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxCount: number
): Promise<boolean> {
  try {
    const supabase = getServiceClient()
    const {data, error} = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max_count: maxCount,
    })
    if (error) {
      console.error('[rate-limit] rpc error:', error.message)
      return true // fail open
    }
    return data === true
  } catch {
    return true // fail open
  }
}
