import type { AppPost } from "@/lib/supabase/types";
import { getUserPostVoteStatus } from "@/lib/supabase/votes";
import { getPostComments } from "@/lib/supabase/comments";
import { getPostVotes } from "@/lib/supabase/votes";
import { toPublicImageUrl } from "@/lib/image";
import Image from "next/image";
import { MessageSquare } from "lucide-react";
import CommentInput from "../comment/CommentInput";
import TimeAgo from "../TimeAgo";
import CommentList from "../comment/CommentList";
import PostVoteButtons from "./PostVoteButtons";
import ReportButton from "@/components/ReportButton";
import DeleteButton from "../DeleteButton";
import { ShareButton } from "@/components/ShareButton";


interface PostProps {
  post: AppPost;
  userId: string | null;
}

// votes, vote status, comments
async function Post({ post, userId }: PostProps) {
  // Use pre-aggregated vote counts from feed query if available, otherwise fetch
  const votes = (post.upvotes !== undefined && post.downvotes !== undefined)
    ? { upvotes: post.upvotes, downvotes: post.downvotes, netScore: post.netScore ?? post.upvotes - post.downvotes }
    : await getPostVotes(post._id);
  const vote = await getUserPostVoteStatus(post._id, userId);
  const comments = await getPostComments(post._id, userId);

  return (
    <article key={post._id}
      id={`post-${post._id}`}
      className="relative bg-white rounded-md shadow-sm border border-gray-200 hover:border-gray-300 transition-colors"
    >
      <div className="flex">
        {/* Vote Buttons */}
        <PostVoteButtons
          contentId={post._id}
          votes={votes}
          vote={vote}
          contentType="post"
        />

        {/* post content */}
        <div className="flex-1 min-w-0 p-3">
          {/* Meta row + inline action buttons */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 min-w-0">
              {post.subxeuron && (
                <>
                  <a href={`/x/${post.subxeuron.slug}`} className="font-medium hover:underline">
                    c/{post.subxeuron.title}
                  </a>
                  <span>·</span>
                </>
              )}
              {post.author && (
                <>
                  <span>Posted by</span>
                  <a href={`/u/${post.author.username}`} className="hover:underline">
                    u/{post.author.username}
                  </a>
                </>
              )}
              {post.publishedAt && (
                <>
                  <span>·</span>
                  <TimeAgo date={new Date(post.publishedAt)} />
                </>
              )}
            </div>

            {/* Report / Delete — inline, no overlap */}
            <div className="flex items-center gap-1 shrink-0">
              <ReportButton contentId={post._id} contentType="post" />
              {post.author?._id && (
                <DeleteButton
                  contentOwnerId={post.author._id}
                  contentId={post._id}
                  contentType="post"
                />
              )}
            </div>
          </div>

          <h2 className="text-lg font-medium text-gray-900 mb-2 break-words">
            {post.title}
          </h2>

          {post.body && post.body[0]?.children?.[0]?.text && (
            <div className="prose prose-sm max-w-none text-gray-700 mb-3 break-words">
              {post.body[0].children[0].text}
            </div>
          )}

          {post.image_url && (
            <div className="relative w-full h-64 mb-3 bg-gray-100/30">
              <Image
                src={toPublicImageUrl(post.image_url)}
                alt={post.image_alt ?? 'Post image'}
                fill
                className="object-contain rounded-md p-2"
              />
            </div>
          )}

          <div className="flex items-center gap-1">
            <button className="flex items-center px-2 py-2 gap-1 text-sm text-gray-500">
              <MessageSquare className="w-4 h-4" />
              <span>{comments.length} Comments</span>
            </button>
            <ShareButton path={post.subxeuron ? `/x/${post.subxeuron.slug}#post-${post._id}` : `#post-${post._id}`} />
          </div>

          <CommentInput postId={post._id} />
          <CommentList postId={post._id} comments={comments} userId={userId} />
        </div>
      </div>
    </article>


  )
}

export default Post