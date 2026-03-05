import type { AppComment } from "@/lib/supabase/types";
import { UserCircle } from "lucide-react";
import Image from "next/image";
import TimeAgo from "../TimeAgo";
import CommentList from "./CommentList";
import CommentReply from "./CommentReply";
import PostVoteButtons from "../post/PostVoteButtons";

function Comment({
  postId,
  comment,
  userId,
}: {
  postId: string;
  comment: AppComment;
  userId: string | null;
}) {
  // replies are pre-fetched by getPostComments — no extra DB call needed
  const replies = comment.replies ?? [];
  const userVoteStatus = comment.votes?.voteStatus ?? null;

  return (
    <article className="py-5 border-b border-gray-100 last:border-0">
      <div className="flex gap-4">
        {/* PostVoteButtons */}
        <PostVoteButtons
          contentId={comment._id}
          votes={comment.votes}
          vote={userVoteStatus}
          contentType="comment"
        />

        {/* Show user image if present, else show image circle */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {comment.author?.imageUrl ? (
              <div className="shrink-0">
                <Image
                  src={comment.author.imageUrl}
                  alt={`${comment.author.username}'s profile`}
                  className="w-10 h-10 rounded-full object-cover"
                  width={40}
                  height={40}
                />
              </div>

            ) : (
              <div className="shrink-0">
                <UserCircle className="w-10 h-10 text-gray-300" />
              </div>
            )}
            <h3 className="text-s text-gray-700">
              {comment.author?.username || "Anonymous"}
            </h3>
            <span className="text-xs text-gray-500">
              <TimeAgo date={new Date(comment.createdAt!)} />
            </span>
          </div>

          {/* Comment Content */}
          <p className="text-gray-700 leading-relaxed">{comment.content}</p>

          <CommentReply postId={postId} comment={comment} />

          {/* Comment Replies - infinite nesting */}
          {replies?.length > 0 && (
            <div>
              <CommentList postId={postId} comments={replies} userId={userId} />
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default Comment