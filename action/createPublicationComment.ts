'use server'

import { getUser } from '@/lib/supabase/user'
import { addPublicationComment } from '@/lib/supabase/publication-comments'
import { sendEmail, buildCommentNotificationEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rateLimit'

export async function createPublicationComment(
  publicationId: string,
  content: string,
  parentId?: string
): Promise<{ ok: true } | { error: string }> {
  const user = await getUser()
  if ('error' in user) return { error: user.error }

  // 10 comments per user per 60 s
  const allowed = await checkRateLimit(`comments:${user._id}`, 60, 10)
  if (!allowed) return { error: 'Too many comments. Please wait a moment.' }

  const result = await addPublicationComment({
    publicationId,
    authorId: user._id,
    content,
    parentId: parentId ?? null,
  })

  if ('error' in result) return { error: result.error }

  // Fire-and-forget notification to publication creator
  sendNotifyCreator({ publicationId, commenterUsername: user.username, commentContent: content }).catch(() => {})

  return { ok: true }
}

async function sendNotifyCreator(params: {
  publicationId: string
  commenterUsername: string
  commentContent: string
}) {
  try {
    const supabase = await createClient()
    const { data: pub } = await supabase
      .from('publication')
      .select('title, slug, creator:user(username, email)')
      .eq('id', params.publicationId)
      .maybeSingle()

    if (!pub) return
    const creator = (pub as { title: string; slug: string; creator: { username: string; email: string } | null }).creator
    if (!creator?.email || !creator?.username) return
    if (creator.username === params.commenterUsername) return

    // Max 1 notification email to this creator per publication per hour
    const emailAllowed = await checkRateLimit(`email:pubcomment:${params.publicationId}:${creator.username}`, 3600, 1)
    if (!emailAllowed) return

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.xeuron.com'
    const payload = buildCommentNotificationEmail({
      recipientEmail: creator.email,
      recipientUsername: creator.username,
      commenterUsername: params.commenterUsername,
      contentTitle: (pub as { title: string }).title,
      contentType: 'post',
      commentSnippet: params.commentContent,
      contentUrl: `${baseUrl}/p/${(pub as { slug: string }).slug}?tab=papers`,
      commentedAt: new Date().toISOString(),
    })

    await sendEmail(payload)
  } catch (err) {
    console.error('[notify] Failed to send publication comment notification:', err)
  }
}
