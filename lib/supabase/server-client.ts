import { createClient } from './server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let serviceClient: ReturnType<typeof createSupabaseClient> | null = null

/** Server client with user's session (RLS applies). Use in most server code. */
export { createClient } from './server'

/** Service role client (bypasses RLS). Use only in server code for admin operations (e.g. reportContent). */
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceClient) {
    serviceClient = createSupabaseClient(url, key, { auth: { persistSession: false } })
  }
  return serviceClient
}
