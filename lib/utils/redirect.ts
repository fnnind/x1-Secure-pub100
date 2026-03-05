/**
 * Validates that a redirect target is a same-origin relative path.
 * Returns '/' for any value that could redirect to an external domain.
 *
 * Blocks:
 *   - Absolute URLs:          'https://evil.com'
 *   - Protocol-relative URLs: '//evil.com'
 *   - Backslash variants:     '/\evil.com'  (IE/edge browser parsing)
 *   - Anything not starting with '/'
 */
export function safeRedirect(url: string | null | undefined): string {
  if (!url) return '/'
  if (!url.startsWith('/')) return '/'
  if (url.startsWith('//')) return '/'
  if (url.startsWith('/\\')) return '/'
  return url
}
