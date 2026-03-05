'use server';

import { getUser } from "@/lib/supabase/user";
import { upvoteComment, upvotePost } from "@/lib/supabase/votes";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { revalidatePath } from "next/cache";

export async function upvote(
    contentId: string,
    contentType: "post" | "comment" = "post"
) {
    const user = await getUser();
    if ("error" in user) {
        return { error: user.error };
    }

    // 30 votes (up + down combined) per user per 60 s
    const allowed = await checkRateLimit(`votes:${user._id}`, 60, 30)
    if (!allowed) return { error: 'Too many votes. Please slow down.' }

    if (contentType === "comment") {
        const vote = await upvoteComment(contentId, user._id);
        revalidatePath('/', 'layout')
        return { vote };
    } else {
        const vote = await upvotePost(contentId, user._id);
        revalidatePath('/', 'layout')
        return { vote };
    }
}
