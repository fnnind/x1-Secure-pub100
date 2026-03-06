'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/supabase/user'
import { updateUserProfile, type UpdateUserProfileInput } from '@/lib/supabase/mutations'

export async function updateUserProfileAction(
  input: UpdateUserProfileInput
): Promise<{ success: true } | { error: string }> {
  const user = await getUser()
  if ('error' in user) return { error: 'Not authenticated' }

  const result = await updateUserProfile(user._id, input)
  if ('error' in result) return result

  revalidatePath(`/u/${user.username}`)
  revalidatePath('/settings/profile')
  return { success: true }
}
