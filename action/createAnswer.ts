'use server'

import { getUser } from '@/lib/supabase/user'
import { createAnswer as createAnswerDb } from '@/lib/supabase/mutations'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, buildAnswerNotificationEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/utils/rateLimit'

export async function createAnswer(params: { questionId: string; content: string }) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }
    if (!params.content?.trim()) return { error: 'Answer content is required' }

    // 10 answers per user per 60 s
    const allowed = await checkRateLimit(`answers:${user._id}`, 60, 10)
    if (!allowed) return { error: 'Too many answers. Please wait a moment.' }

    const result = await createAnswerDb({
      questionId: params.questionId,
      authorId: user._id,
      content: params.content.trim(),
    })

    // Fire-and-forget notification to question author
    sendNotifyQuestionAuthor({
      questionId: params.questionId,
      answererUsername: user.username,
      answerContent: params.content.trim(),
    }).catch(() => {})

    return result
  } catch (err) {
    console.error('createAnswer action error:', err)
    return { error: 'Failed to post answer' }
  }
}

async function sendNotifyQuestionAuthor(params: {
  questionId: string
  answererUsername: string
  answerContent: string
}) {
  try {
    const supabase = await createClient()
    const { data: question } = await supabase
      .from('event_question')
      .select('content, event_id, author:user(username, email)')
      .eq('id', params.questionId)
      .maybeSingle()

    if (!question) return
    const author = (question as { content: string; event_id: string; author: { username: string; email: string } | null }).author
    if (!author?.email || !author?.username) return
    if (author.username === params.answererUsername) return

    // Max 1 notification email to this author per question per hour
    const emailAllowed = await checkRateLimit(`email:answer:${params.questionId}:${author.username}`, 3600, 1)
    if (!emailAllowed) return

    const eventId = (question as { event_id: string }).event_id
    const { data: event } = await supabase
      .from('event')
      .select('title, publication_id')
      .eq('id', eventId)
      .maybeSingle()

    const eventTitle = (event as { title: string } | null)?.title ?? 'an event'
    const publicationId = (event as { publication_id: string | null } | null)?.publication_id
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.xeuron.com'

    let answerUrl = `${baseUrl}/events/${eventId}`
    if (publicationId) {
      const { data: pub } = await supabase
        .from('publication')
        .select('slug')
        .eq('id', publicationId)
        .maybeSingle()
      if (pub) answerUrl = `${baseUrl}/p/${(pub as { slug: string }).slug}/events/${eventId}`
    }

    const payload = buildAnswerNotificationEmail({
      recipientEmail: author.email,
      recipientUsername: author.username,
      answererUsername: params.answererUsername,
      questionSnippet: (question as { content: string }).content,
      answerSnippet: params.answerContent,
      eventTitle,
      answerUrl,
      answeredAt: new Date().toISOString(),
    })

    await sendEmail(payload)
  } catch (err) {
    console.error('[notify] Failed to send answer notification:', err)
  }
}
