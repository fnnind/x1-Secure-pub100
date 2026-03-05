import { createClient } from './server'

export interface UserResult {
  _id: string
  username: string
  imageUrl: string
  email: string
}

function parseUsername(raw: string): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return (
    raw
      .replace(/\s+(.)/g, (_, char: string) => char.toUpperCase())
      .replace(/\s+/g, '') + randomNum
  )
}

/** Get current user profile from Supabase Auth + public.user (create row if missing). Same shape as legacy getUser for drop-in replacement. */
export async function getUser(): Promise<UserResult | { error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return { error: 'User not found' }
    }

    const { data: profile } = await supabase
      .from('user')
      .select('id, username, email, image_url')
      .eq('id', authUser.id)
      .single()

    if (profile) {
      return {
        _id: profile.id,
        username: profile.username ?? '',
        imageUrl: profile.image_url ?? '',
        email: profile.email ?? '',
      } satisfies UserResult
    }

    const username =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split('@')[0] ||
      'user'
    const email = authUser.email ?? authUser.user_metadata?.email ?? ''
    const imageUrl =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      ''

    const { data: newProfile, error: insertError } = await supabase
      .from('user')
      .insert({
        id: authUser.id,
        username: parseUsername(username),
        email: email || `${authUser.id}@placeholder.local`,
        image_url: imageUrl || null,
        joined_at: new Date().toISOString(),
      })
      .select('id, username, email, image_url')
      .single()

    if (insertError || !newProfile) {
      console.error('addUser error:', insertError)
      return { error: 'Failed to create user profile' }
    }

    return {
      _id: newProfile.id,
      username: newProfile.username ?? '',
      imageUrl: newProfile.image_url ?? '',
      email: newProfile.email ?? '',
    } satisfies UserResult
  } catch (err) {
    console.error('getUser error:', err)
    return { error: 'Failed to get user' }
  }
}

export async function getUserByUsername(
  username: string
): Promise<{ _id: string; username: string; imageUrl: string | null } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user')
    .select('id, username, image_url')
    .eq('username', username)
    .maybeSingle()
  if (!data) return null
  return { _id: data.id, username: data.username ?? '', imageUrl: data.image_url ?? null }
}

/** Create or ensure user profile (for server use; getUser already does upsert). */
export async function addUser(params: {
  id: string
  username: string
  email: string
  imageUrl: string
}): Promise<UserResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user')
    .upsert(
      {
        id: params.id,
        username: params.username,
        email: params.email,
        image_url: params.imageUrl || null,
        joined_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('id, username, email, image_url')
    .single()

  if (error) throw error
  return {
    _id: data.id,
    username: data.username ?? '',
    imageUrl: data.image_url ?? '',
    email: data.email ?? '',
  }
}
