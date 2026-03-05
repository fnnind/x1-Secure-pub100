/**
 * Image URL helpers for Supabase. Use for post/subxeuron image_url.
 */

/** CDN base for public content URLs (S3 bucket is not publicly accessible). */
const CONTENT_CDN_BASE = process.env.NEXT_PUBLIC_CONTENT_CDN_BASE ?? 'https://content.xeuron.net'

/**
 * Rewrites S3 URLs to the public CDN URL. Use for any content URL (images, PDFs, etc.)
 * that may be stored as an S3 URL.
 */
export function toPublicContentUrl(url: string): string {
  if (!url || typeof url !== 'string') return url
  try {
    const u = new URL(url)
    if (u.hostname.includes('.s3.') && u.hostname.endsWith('.amazonaws.com')) {
      return `${CONTENT_CDN_BASE.replace(/\/$/, '')}${u.pathname}`
    }
  } catch {
    // invalid URL, return as-is
  }
  return url
}

/** Rewrites S3 image URLs to the public CDN URL for Next.js Image and browsers. */
export function toPublicImageUrl(url: string): string {
  return toPublicContentUrl(url)
}

/** Accepts { image_url } or { url } for compatibility. Prefer passing image_url string directly to toPublicImageUrl. */
type ImageSource =
  | { image_url?: string | null; alt?: string | null }
  | { url?: string; alt?: string }
  | null
  | undefined

export function urlFor(source: ImageSource): { url: () => string } {
  const url =
    source && typeof source === 'object'
      ? 'image_url' in source
        ? (source.image_url ?? '')
        : 'url' in source
          ? (source.url ?? '')
          : ''
      : ''
  return { url: () => url }
}
