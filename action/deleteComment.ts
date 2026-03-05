'use server';

import { getCommentById } from "@/lib/supabase/comments";
import { deleteComment as deleteCommentDb } from "@/lib/supabase/mutations";
import { getUser } from "@/lib/supabase/user";

export const deleteComment = async (commentId: string) => {
    const user = await getUser();

    if ("error" in user) return "user not found";

    const comment = await getCommentById(commentId);
    if (!comment) {
        return { error: "Comment not found" };
    }

    if (comment.author?._id !== user._id) {
        return { error: "You are not authorized to delete this comment" };
    }

    const result = await deleteCommentDb(commentId);
    if ("error" in result) return { error: result.error };
    return { success: "Comment deleted successfully" };
}