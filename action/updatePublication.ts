'use server'

import { getUser } from '@/lib/supabase/user'
import { updatePublication as updatePublicationDb } from '@/lib/supabase/mutations'
import type { PublicationType } from '@/lib/supabase/types'

export async function updatePublication(
  publicationId: string,
  params: {
    title: string
    abstract?: string
    description?: string
    doi?: string
    sourceUrl?: string
    publishedYear?: number
    publicationType?: PublicationType
    fieldOfStudy?: string
  }
): Promise<{ success: true } | { error: string }> {
  try {
    const user = await getUser()
    if ('error' in user) return { error: 'Not authenticated' }

    if (!params.title?.trim()) return { error: 'Title is required' }
    if (params.title.trim().length > 200) return { error: 'Title must be 200 characters or fewer' }

    return await updatePublicationDb(publicationId, user._id, {
      title: params.title.trim(),
      abstract: params.abstract?.trim(),
      description: params.description?.trim(),
      doi: params.doi?.trim().replace(/^https?:\/\/doi\.org\//i, '') || undefined,
      sourceUrl: params.sourceUrl?.trim() || undefined,
      publishedYear: params.publishedYear,
      fieldOfStudy: params.fieldOfStudy?.trim() || undefined,
    })
  } catch (err) {
    console.error('updatePublication action error:', err)
    return { error: 'Failed to update publication' }
  }
}
