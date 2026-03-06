'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/supabase/user'
import { uploadImageToS3 } from '@/lib/s3'
import { createClient } from '@/lib/supabase/server-client'

/**
 * Upload a base64 image to S3 under avatars/{userId}/... and persist the
 * resulting CDN URL to public.user.image_url.
 */
export async function uploadAvatar(
  base64DataUrl: string,
  filename: string
): Promise<{ url: string } | { error: string }> {
  const user = await getUser()
  if ('error' in user) return { error: 'Not authenticated' }

  const result = await uploadImageToS3(base64DataUrl, filename, 'avatars', user._id)
  if ('error' in result) return result

  const supabase = await createClient()
  const { error } = await supabase
    .from('user')
    .update({ image_url: result.url })
    .eq('id', user._id)

  if (error) return { error: error.message }

  revalidatePath(`/u/${user.username}`)
  revalidatePath('/settings/profile')

  return { url: result.url }
}
