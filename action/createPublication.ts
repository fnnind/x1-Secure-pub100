'use server'

import { getUser } from '@/lib/supabase/user'
import { createPublication as createPublicationDb } from '@/lib/supabase/mutations'
import type { PublicationType } from '@/lib/supabase/types'
import type { ImageData } from '@/lib/supabase/mutations'

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export async function createPublication(params: {
  title: string
  slug?: string
  description?: string
  abstract?: string
  publicationType: PublicationType
  sourceUrl?: string
  doi?: string
  publishedYear?: number
  imageBase64?: string | null
  imageFilename?: string | null
  imageContentType?: string | null
  pdfUrl?: string
  initialAuthors?: Array<{ userName: string; affiliation?: string; userId?: string; isCorresponding?: boolean }>
}) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }

    if (!params.title?.trim()) return { error: 'Title is required' }
    if (params.title.trim().length < 3) return { error: 'Title must be at least 3 characters' }
    if (params.title.trim().length > 200) return { error: 'Title must be 200 characters or fewer' }

    const slug = (params.slug?.trim() || generateSlug(params.title))
    if (!/^[a-z0-9-]+$/.test(slug)) return { error: 'Slug must only contain lowercase letters, numbers, and hyphens' }
    if (slug.length < 3) return { error: 'Slug must be at least 3 characters' }

    let imageData: ImageData = null
    if (params.imageBase64 && params.imageFilename && params.imageContentType) {
      imageData = {
        base64: params.imageBase64,
        filename: params.imageFilename,
        contentType: params.imageContentType,
      }
    }

    const result = await createPublicationDb({
      title: params.title.trim(),
      slug,
      description: params.description?.trim(),
      abstract: params.abstract?.trim(),
      publicationType: params.publicationType,
      sourceUrl: params.sourceUrl?.trim(),
      doi: params.doi?.trim().replace(/^https?:\/\/doi\.org\//i, ''),
      publishedYear: params.publishedYear,
      imageData,
      pdfUrl: params.pdfUrl,
      creatorId: user._id,
      initialAuthors: params.initialAuthors,
    })

    return result
  } catch (err) {
    console.error('createPublication action error:', err)
    return { error: 'Failed to create publication' }
  }
}
