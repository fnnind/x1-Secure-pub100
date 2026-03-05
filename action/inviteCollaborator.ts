'use server'

import { getUser } from '@/lib/supabase/user'
import { inviteCollaborator as inviteCollaboratorDb, respondToCollaboratorInvite } from '@/lib/supabase/mutations'
import { createClient } from '@/lib/supabase/server'

export async function inviteCollaborator(params: {
  publicationId: string
  username: string
  role: 'co-author' | 'reviewer' | 'editor' | 'contributor'
}) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }

    // Resolve username → user id
    const supabase = await createClient()
    const { data: invitee } = await supabase
      .from('user')
      .select('id, username')
      .eq('username', params.username)
      .maybeSingle()
    if (!invitee) return { error: `User @${params.username} not found` }
    if ((invitee as { id: string }).id === user._id) return { error: 'You cannot invite yourself' }

    return inviteCollaboratorDb({
      publicationId: params.publicationId,
      userId: (invitee as { id: string }).id,
      invitedById: user._id,
      role: params.role,
    })
  } catch (err) {
    console.error('inviteCollaborator action error:', err)
    return { error: 'Failed to send invitation' }
  }
}

export async function respondToInvite(params: {
  publicationId: string
  accept: boolean
}) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }
    return respondToCollaboratorInvite({
      publicationId: params.publicationId,
      userId: user._id,
      accept: params.accept,
    })
  } catch (err) {
    console.error('respondToInvite action error:', err)
    return { error: 'Failed to respond to invitation' }
  }
}
