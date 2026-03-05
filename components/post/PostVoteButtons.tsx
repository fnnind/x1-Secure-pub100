'use client'
import { downvote } from "@/action/downvote";
import { upvote } from "@/action/upvote";
import type { VoteCounts } from "@/lib/supabase/types";
import { useUser } from "@/lib/supabase/auth-context";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, useTransition } from "react";

function PostVoteButtons({
  contentId,
  votes,
  vote,
  contentType = "post",
}: {
  contentId: string;
  votes: VoteCounts;
  vote: "upvote" | "downvote" | null;
  contentType?: "post" | "comment";
}) {

  const { user, isSignedIn } = useUser();
  const [isPending, startTransition] = useTransition();

  // Use of Optimistic Vote
  // - To update UI immediately while awaiting backend atomic COMMIT. if commit failed, will then revert the vote count update
// TODO: Add a loading state when the vote is pending
// TODO: Add optimistic update for comment in component->comment->CommentInput.tsx

  const [optimisticVote, setOptimisticVote] =
    useState<GetUserPostVoteStatusQueryResult>(vote);
  const [optimisticScore, setOptimisticScore] =
    useState<number>(votes.netScore);

  const handleUpvote = () => {
    if (!isSignedIn || isPending) return;

    // Calculate score change based on current vote status
    // It tracks number of changes, not numerical score
    let scoreChange = 0;
    if (optimisticVote === "upvote") {
      // user is canceling their upvote
      scoreChange = -1;
      setOptimisticVote(null);
    } else if (optimisticVote === "downvote") {
      // User changes from downvote to upvote 
      // +2 because we remove downvote and add upvote
      scoreChange = +2;
      setOptimisticVote("upvote");
    } else {
      // user adds a new upvote
      scoreChange = +1;
      setOptimisticVote("upvote");
    }
    //update score UI immediately for better UX
    setOptimisticScore((prev) => prev + scoreChange);

    // finally update the DB backend
    startTransition(async () => {
      try {
        await upvote(contentId, contentType);
      } catch (error) {
        // if there's an error, revert the optimistic updates
        setOptimisticVote(vote);
        setOptimisticScore(votes.netScore);
        console.error(`Failed to upvote ${contentType}`, error)
      }
    });
  };

  const handleDownvote = () => {
    if (!isSignedIn || isPending) return;

    // Calculate score change based on current vote status
    // It tracks number of changes, not numerical score
    let scoreChange = 0;
    if (optimisticVote === "downvote") {
      // user is canceling their downvote
      scoreChange = 1;
      setOptimisticVote(null);
    } else if (optimisticVote === "upvote") {
      // User changes from upvote to downvote 
      // -2 because we remove upvote and add downvote
      scoreChange = -2;
      setOptimisticVote("downvote");
    } else {
      // user adds a new downvote
      scoreChange = -1;
      setOptimisticVote("downvote");
    }
    //update score UI immediately for better UX
    setOptimisticScore((prev) => prev + scoreChange);

    // finally update the DB backend
    startTransition(async () => {
      try {
        await downvote(contentId, contentType);
      } catch (error) {
        // if there's an error, revert the optimistic updates
        setOptimisticVote(vote);
        setOptimisticScore(votes.netScore);
        console.error(`Failed to downtown ${contentType}`, error)
      }
    });
  }

  return (
    <div className="flex flex-col items-center bg-gray-50 p02 rounded-l-md">
      <button
        disabled={!isSignedIn || isPending || !user}
        onClick={handleUpvote}
        className={`p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed
        ${optimisticVote === "upvote" ? "bg-orange-100" : "hover:bg-gray-100"
          } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`
        }
      >
        <ArrowUp
          className={`w-5 h-5 ${optimisticVote === "upvote"
            ? "text-orange-500 font-bold"
            : "text-gray-400 hover:text-orange-500"
            }`}
        />
      </button>

      {/* optimistic Score */}
      <span className="text-sm font-medium text-gray-900">
        {optimisticScore}
      </span>

      <button
        disabled={!isSignedIn || isPending || !user}
        onClick={handleDownvote}
        className={`p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed
        ${optimisticVote === "downvote" ? "bg-orange-100" : "hover:bg-gray-100"
          } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`
        }
      >
        <ArrowDown
          className={`w-5 h-5 ${optimisticVote === "downvote"
            ? "text-orange-500 font-bold"
            : "text-gray-400 hover:text-orange-500"
            }`}
        />
      </button>
    </div>
  )

}

export default PostVoteButtons