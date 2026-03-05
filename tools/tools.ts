import { getServiceClient } from "@/lib/supabase/server-client";
import { z } from "zod";
import { tool } from "ai";

/**
 * Censor inappropriate content in a post's title or body, and mark as reported if necessary.
 */
export const censorPost = tool({
  description:
    "Censor inappropriate content in a post's title and/or body and mark the post as reported if applicable.",
  inputSchema: z.object({
    postId: z.string().describe("The ID of the post to censor"),
    title: z.string().optional().describe("The censored version of the post title"),
    body: z.string().optional().describe("The censored version of the post body"),
    isToBeReported: z
      .boolean()
      .optional()
      .describe(
        "Set to true if the post contains prohibited content and should be marked as reported."
      ),
  }),
  execute: async ({ postId, title, body, isToBeReported }) => {
    if (!isToBeReported) {
      return { success: true, message: `Post ${postId} is not reported` };
    }
    const supabase = getServiceClient();
    const updates: { title?: string; body?: unknown; is_reported?: boolean } = {};
    if (typeof title === "string" && title.length > 0) updates.title = title;
    if (typeof body === "string" && body.length > 0) {
      updates.body = [
        {
          _type: "block",
          _key: Date.now().toString(),
          children: [{ _type: "span", _key: "1", text: body }],
        },
      ];
    }
    if (isToBeReported) updates.is_reported = true;
    await supabase.from("post").update(updates).eq("id", postId);
    return { postId, censored: true, message: "Content has been censored" };
  },
});

/**
 * Report a user for violating subXeuron guidelines.
 */
export const reportUser = tool({
  description:
    "Report a user for violating subXeuron guidelines. This sets isReported: true on the user in the database.",
  inputSchema: z.object({
    userId: z.string().describe("The ID of the user to report"),
  }),
  execute: async ({ userId }) => {
    const supabase = getServiceClient();
    await supabase.from("user").update({ is_reported: true }).eq("id", userId);
    return { success: true, message: `User ${userId} reported successfully` };
  },
});
