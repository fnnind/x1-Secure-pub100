'use server';

import { getUser } from "@/lib/supabase/user";
import { downvoteComment, downvotePost } from "@/lib/supabase/votes";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export async function downvote(
    contentId: string,
    contentType: "post" | "comment" = "post"
) {
    const user = await getUser();
    if ("error" in user) {
        return { error: user.error };
    }

    // shared 'votes' bucket with upvote: 30 per user per 60 s
    const allowed = await checkRateLimit(`votes:${user._id}`, 60, 30)
    if (!allowed) return { error: 'Too many votes. Please slow down.' }

    if (contentType === "comment") {
        const vote = await downvoteComment(contentId, user._id);
        return { vote };
    } else {
        const vote = await downvotePost(contentId, user._id);
        return { vote };
    }
}
