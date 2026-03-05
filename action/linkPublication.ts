'use server'

import { getUser } from '@/lib/supabase/user'
import { getPublicationBySlug } from '@/lib/supabase/publications'
import { getSubxeuronBySlug } from '@/lib/supabase/subxeurons'
import { linkPublicationToSubxeuron } from '@/lib/supabase/mutations'

function parseXeuronLink(input: string): { type: 'publication' | 'subxeuron'; slug: string } | null {
  const cleaned = input.trim().replace(/^https?:\/\/[^/]+/, '')
  const pubMatch = cleaned.match(/^\/p\/([a-z0-9-]+)\/?$/)
  if (pubMatch) return { type: 'publication', slug: pubMatch[1] }
  const subMatch = cleaned.match(/^\/x\/([a-z0-9-]+)\/?$/)
  if (subMatch) return { type: 'subxeuron', slug: subMatch[1] }
  return null
}

export async function linkPublication(params: {
  publicationId: string
  input: string  // accepts /x/slug, /p/slug, or full URL
}) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }

    const parsed = parseXeuronLink(params.input)
    if (!parsed) return { error: 'Invalid link format. Use /x/slug or /p/slug' }

    if (parsed.type === 'subxeuron') {
      const subxeuron = await getSubxeuronBySlug(parsed.slug)
      if (!subxeuron) return { error: `SubXeuron /x/${parsed.slug} not found` }
      return linkPublicationToSubxeuron({
        publicationId: params.publicationId,
        subxeuronId: subxeuron._id,
        linkedById: user._id,
      })
    }

    // type === 'publication' — not a cross-link scenario from a pub, just resolve it
    const pub = await getPublicationBySlug(parsed.slug)
    if (!pub) return { error: `Publication /p/${parsed.slug} not found` }
    return { publication: pub }
  } catch (err) {
    console.error('linkPublication action error:', err)
    return { error: 'Failed to create link' }
  }
}
