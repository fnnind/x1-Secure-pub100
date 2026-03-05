'use server'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

/**
 * S3 uploads use AWS config from .env.local:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_S3_BUCKET
 * - AWS_REGION (optional, default us-east-1)
 */
const bucket = process.env.AWS_S3_BUCKET
const region = process.env.AWS_REGION ?? 'us-east-1'

function getS3Client(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in .env.local')
  }
  if (!bucket) {
    throw new Error('Missing AWS_S3_BUCKET in .env.local')
  }
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
}

/**
 * Upload a buffer to S3. Uses AWS_* from .env.local.
 * @param key - S3 object key (e.g. "subxeuron-pdfs/123-file.pdf" or "posts/userId/123.jpg")
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ url: string; key: string } | { error: string }> {
  try {
    const client = getS3Client()
    await client.send(
      new PutObjectCommand({
        Bucket: bucket!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    )
    // Public URLs go through CDN; direct S3 URLs are not publicly accessible.
    const cdnBase = process.env.NEXT_PUBLIC_CONTENT_CDN_BASE ?? 'https://content.xeuron.net'
    const url = `${cdnBase.replace(/\/$/, '')}/${key}`
    return { url, key }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'S3 upload failed'
    console.error('uploadToS3 error:', err)
    return { error: message }
  }
}

const IMAGE_CONTENT_TYPES = /^image\/(jpeg|jpg|png|gif|webp|avif)$/i

// Max sizes
const IMAGE_MAX_BYTES = 8 * 1024 * 1024   //  8 MB
const PDF_MAX_BYTES   = 20 * 1024 * 1024  // 20 MB

// Magic-byte signatures for supported image formats
const IMAGE_SIGNATURES: Array<{ bytes: number[]; mime: string }> = [
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },           // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png' },      // PNG
  { bytes: [0x47, 0x49, 0x46], mime: 'image/gif' },            // GIF
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' },     // WebP (RIFF header)
]

function matchesMagicBytes(buf: Buffer): boolean {
  return IMAGE_SIGNATURES.some(({ bytes }) =>
    bytes.every((b, i) => buf[i] === b)
  )
}

/**
 * Upload an image from a base64 data URL to S3. For subxeuron/post images.
 * Key: `{prefix}/{entityId}/{timestamp}-{sanitizedFilename}`.
 * Pass the entity id (subxeuron id or post id, UUIDv7) as entityId for S3 path consistency.
 */
export async function uploadImageToS3(
  base64DataUrl: string,
  filename: string,
  prefix: string,
  entityId: string
): Promise<{ url: string; key: string } | { error: string }> {
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return { error: 'Invalid base64 data URL' }
  const contentType = match[1].trim()
  const base64Data = match[2]

  if (!IMAGE_CONTENT_TYPES.test(contentType)) {
    return { error: 'File must be an image (JPEG, PNG, GIF, WebP, AVIF)' }
  }

  const buffer = Buffer.from(base64Data, 'base64')

  if (buffer.length > IMAGE_MAX_BYTES) {
    return { error: 'Image must be smaller than 8 MB' }
  }

  // Validate actual file bytes — reject content-type spoofing
  if (!matchesMagicBytes(buffer)) {
    return { error: 'File content does not match a supported image format' }
  }

  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80)
  const key = `${prefix}/${entityId}/${Date.now()}-${safeName}`
  return uploadToS3(buffer, key, contentType)
}

/**
 * Upload a PDF from a base64 data URL to S3. For subxeuron PDFs.
 */
export async function uploadPdfToS3(
  base64DataUrl: string,
  filename: string
): Promise<{ url: string; key: string } | { error: string }> {
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return { error: 'Invalid base64 data URL' }
  const contentType = match[1].trim()
  const base64Data = match[2]

  if (contentType !== 'application/pdf') {
    return { error: 'File must be a PDF' }
  }

  const buffer = Buffer.from(base64Data, 'base64')

  if (buffer.length > PDF_MAX_BYTES) {
    return { error: 'PDF must be smaller than 20 MB' }
  }

  // Validate PDF magic bytes: %PDF-
  if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
    return { error: 'File content does not appear to be a valid PDF' }
  }

  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80)
  const key = `subxeuron-pdfs/${Date.now()}-${safeName}`
  return uploadToS3(buffer, key, contentType)
}
