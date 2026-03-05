'use server';

import { getSubxeuronBySlug } from "@/lib/supabase/subxeurons";
import { getPublicationBySlug } from "@/lib/supabase/publications";
import { getEventById } from "@/lib/supabase/events";
import { createPost as createPostDb, deletePost } from "@/lib/supabase/mutations";
import { getUser } from "@/lib/supabase/user";
import { generateId } from "@/lib/utils/id";
import { uploadImageToS3 } from "@/lib/s3";

import { censorPost, reportUser } from "@/tools/tools";
import { generateText, ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { checkRateLimit } from "@/lib/utils/rateLimit";

import { systemPrompt } from "@/tools/prompt";

export async function createPost({
  title,
  subxeuronSlug,
  publicationSlug,
  eventId,
  body,
  imageBase64,
  imageFilename,
  imageContentType,
}: {
  title: string;
  subxeuronSlug?: string | null;
  publicationSlug?: string | null;
  eventId?: string | null;
  body?: string | null;
  imageBase64?: string | null;
  imageFilename?: string | null;
  imageContentType?: string | null;
}) {

  try {
    if (!title) return { error: "Title is required" };
    if (!subxeuronSlug && !publicationSlug && !eventId) {
      return { error: "A subxeuron, publication, or event context is required" };
    }

    const user = await getUser();
    if ("error" in user) return { error: user.error };

    // 5 posts per user per hour
    const allowed = await checkRateLimit(`posts:${user._id}`, 3600, 5)
    if (!allowed) return { error: 'Post limit reached. You can create up to 5 posts per hour.' }

    // Resolve the context to a DB id
    let resolvedSubxeuronId: string | null = null
    let resolvedPublicationId: string | null = null
    let resolvedEventId: string | null = null

    if (subxeuronSlug) {
      const subxeuron = await getSubxeuronBySlug(subxeuronSlug);
      if (!subxeuron?._id) return { error: `Subxeuron "${subxeuronSlug}" not found` };
      resolvedSubxeuronId = subxeuron._id
    } else if (publicationSlug) {
      const publication = await getPublicationBySlug(publicationSlug);
      if (!publication?._id) return { error: `Publication not found` };
      resolvedPublicationId = publication._id
    } else if (eventId) {
      const event = await getEventById(eventId);
      if (!event?._id) return { error: `Event not found` };
      resolvedEventId = event._id
    }

    const postId = generateId();
    let imageUrl: string | null = null;
    if (imageBase64 && imageFilename && imageContentType) {
      const dataUrl = imageBase64.includes(",") ? imageBase64 : `data:${imageContentType};base64,${imageBase64}`;
      const result = await uploadImageToS3(dataUrl, imageFilename, "posts", postId);
      if (!("error" in result)) imageUrl = result.url;
    }

    const bodyBlock = body
      ? [{ _type: "block" as const, _key: Date.now().toString(), children: [{ _type: "span" as const, _key: "1", text: body }] }]
      : undefined;

    const result = await createPostDb({
      id: postId,
      title,
      authorId: user._id,
      subxeuronId: resolvedSubxeuronId,
      publicationId: resolvedPublicationId,
      eventId: resolvedEventId,
      body: bodyBlock,
      imageUrl,
      imageAlt: null,
    });
    if ("error" in result) return result;
    const post = result.post;

    // ---- MODERATION STEP ----
    const messages: ModelMessage[] = [
      {
        role: "user",
        content: `I posted this post -> Post ID: ${post._id}\nTitle: ${title}\nbody: ${body}`
      },
    ];

    try {
      await generateText({
        model: openai("gpt-4.1-mini"),
        messages: messages as ModelMessage[],
        system: systemPrompt,
        tools: {
          censorPost,
          reportUser,
        },
      });
    } catch {
      await deletePost(post._id);
      return { error: "Content review is temporarily unavailable. Please try again in a moment." };
    }
    // ---- END MODERATION STEP ----

    return { post }

  } catch {
    return { error: "Failed to create post" };
  }
}
