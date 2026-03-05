'use server';

import { getPostById } from "@/lib/supabase/posts";
import { deletePost as deletePostDb } from "@/lib/supabase/mutations";
import { getUser } from "@/lib/supabase/user";

export const deletePost = async (postId: string) => {
    const user = await getUser();

    if ("error" in user) return "user not found";

    const post = await getPostById(postId);
    if (!post) {
        return { error: "Post not found" };
    }

    if (post.author?._id !== user._id) {
        return { error: "You are not authorized to delete this post" };
    }

    const result = await deletePostDb(postId);
    if ("error" in result) return { error: result.error };
    return { success: "Post deleted successfully" };
}