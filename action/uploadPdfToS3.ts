'use server'

import { uploadPdfToS3 as uploadPdf } from '@/lib/s3'

/**
 * Uploads a PDF to S3. Expects base64 data URL (e.g. from FileReader.readAsDataURL).
 * Uses AWS_* config from .env.local. Returns the public URL of the uploaded file.
 */
export async function uploadPdfToS3(
  base64DataUrl: string,
  filename: string
): Promise<{ url: string; key: string } | { error: string }> {
  return uploadPdf(base64DataUrl, filename)
}
