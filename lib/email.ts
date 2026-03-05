/**
 * Email sending utility using Resend REST API.
 * Requires RESEND_API_KEY and RESEND_FROM_EMAIL environment variables.
 *
 * Get a free API key at https://resend.com
 * Recommended from address: "Xeuron <noreply@yourdomain.com>"
 */

const RESEND_API_URL = 'https://api.resend.com/emails'

export type EmailPayload = {
  to: string
  subject: string
  html: string
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: true } | { error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? 'Xeuron <noreply@xeuron.com>'

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return { ok: true }
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[email] Resend error:', body)
      return { error: `Email send failed: ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    console.error('[email] Unexpected error:', err)
    return { error: 'Email send failed unexpectedly' }
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function baseLayout(body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Xeuron Notification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; }
    .header { background: #18181b; padding: 20px 32px; }
    .header a { color: #fff; font-size: 18px; font-weight: 700; text-decoration: none; letter-spacing: -0.02em; }
    .content { padding: 32px; color: #374151; font-size: 15px; line-height: 1.6; }
    .snippet { background: #f3f4f6; border-left: 3px solid #6366f1; border-radius: 4px; padding: 12px 16px; margin: 16px 0; font-style: italic; color: #4b5563; }
    .cta { display: inline-block; margin-top: 20px; background: #6366f1; color: #fff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .footer { padding: 16px 32px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <a href="https://www.xeuron.com">Xeuron</a>
    </div>
    <div class="content">${body}</div>
    <div class="footer">
      You received this because someone interacted with content you created on Xeuron.
      <br />© ${new Date().getFullYear()} Xeuron. All rights reserved.
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(iso?: string): string {
  if (!iso) return 'just now'
  return new Date(iso).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function truncate(text: string, max = 200): string {
  return text.length <= max ? text : text.slice(0, max).trim() + '…'
}

export type CommentNotificationParams = {
  recipientEmail: string
  recipientUsername: string
  commenterUsername: string
  contentTitle: string         // post/subxeuron/event/publication title
  contentType: 'post' | 'subxeuron' | 'event' | 'publication'
  commentSnippet: string
  contentUrl: string           // full URL to the post/event/etc.
  commentedAt?: string         // ISO date
}

export function buildCommentNotificationEmail(p: CommentNotificationParams): EmailPayload {
  const articleLabel = p.contentType === 'event' ? 'event' : p.contentType === 'publication' ? 'publication' : p.contentType === 'subxeuron' ? 'SubXeuron' : 'post'
  const subject = `${escapeHtml(p.commenterUsername)} commented on your ${articleLabel} — "${escapeHtml(p.contentTitle)}"`

  const html = baseLayout(`
    <p>Hi <strong>${escapeHtml(p.recipientUsername)}</strong>,</p>
    <p>
      <strong>${escapeHtml(p.commenterUsername)}</strong> left a comment on your ${articleLabel}
      <strong>"${escapeHtml(p.contentTitle)}"</strong> on ${formatDate(p.commentedAt)}:
    </p>
    <div class="snippet">${escapeHtml(truncate(p.commentSnippet))}</div>
    <p>Jump in to continue the conversation:</p>
    <a class="cta" href="${escapeHtml(p.contentUrl)}">View comment →</a>
  `)

  return { to: p.recipientEmail, subject, html }
}

export type AnswerNotificationParams = {
  recipientEmail: string
  recipientUsername: string
  answererUsername: string
  questionSnippet: string
  answerSnippet: string
  eventTitle: string
  answerUrl: string
  answeredAt?: string
}

export function buildAnswerNotificationEmail(p: AnswerNotificationParams): EmailPayload {
  const subject = `${escapeHtml(p.answererUsername)} answered your question in "${escapeHtml(p.eventTitle)}"`

  const html = baseLayout(`
    <p>Hi <strong>${escapeHtml(p.recipientUsername)}</strong>,</p>
    <p>
      <strong>${escapeHtml(p.answererUsername)}</strong> answered your question in the event
      <strong>"${escapeHtml(p.eventTitle)}"</strong> on ${formatDate(p.answeredAt)}:
    </p>
    <p style="color:#6b7280;font-size:13px;margin-bottom:4px;">Your question:</p>
    <div class="snippet">${escapeHtml(truncate(p.questionSnippet))}</div>
    <p style="color:#6b7280;font-size:13px;margin-bottom:4px;">Their answer:</p>
    <div class="snippet">${escapeHtml(truncate(p.answerSnippet))}</div>
    <a class="cta" href="${escapeHtml(p.answerUrl)}">View answer →</a>
  `)

  return { to: p.recipientEmail, subject, html }
}
