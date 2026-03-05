'use server';

import { addComment } from "@/lib/supabase/mutations";
import { getUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, buildCommentNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export async function createComment(
  postId: string,
  content: string,
  parentCommentId?: string
) {
  const user = await getUser();

  if ("error" in user) {
    return { error: user.error };
  }

  // 10 comments per user per 60 s
  const allowed = await checkRateLimit(`comments:${user._id}`, 60, 10)
  if (!allowed) return { error: 'Too many comments. Please wait a moment.' }

  try {
    const result = await addComment({
      postId,
      userId: user._id,
      content,
      parentCommentId,
    });

    // Fire-and-forget email notification to post author
    sendNotifyPostAuthor({ postId, commenterUsername: user.username, commentContent: content }).catch(() => {});

    return result;

  } catch (error) {
    console.error("Error adding comment:", error);
    return { error: "Failed to add comment" };
  }
}

async function sendNotifyPostAuthor(params: {
  postId: string
  commenterUsername: string
  commentContent: string
}) {
  try {
    const supabase = await createClient()
    const { data: post } = await supabase
      .from('post')
      .select('title, author:user(username, email)')
      .eq('id', params.postId)
      .maybeSingle()

    if (!post) return
    const author = (post as { title: string; author: { username: string; email: string } | null }).author
    if (!author?.email || !author?.username) return
    // Don't notify if commenter is the author
    if (author.username === params.commenterUsername) return

    // Max 1 notification email to this author per post per hour
    const emailAllowed = await checkRateLimit(`email:comment:${params.postId}:${author.username}`, 3600, 1)
    if (!emailAllowed) return

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.xeuron.com'
    const payload = buildCommentNotificationEmail({
      recipientEmail: author.email,
      recipientUsername: author.username,
      commenterUsername: params.commenterUsername,
      contentTitle: (post as { title: string }).title,
      contentType: 'post',
      commentSnippet: params.commentContent,
      contentUrl: `${baseUrl}/post/${params.postId}`,
      commentedAt: new Date().toISOString(),
    })

    await sendEmail(payload)
  } catch (err) {
    console.error('[notify] Failed to send comment notification:', err)
  }
}
