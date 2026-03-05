"use client"
import type { AppComment } from '@/lib/supabase/types';
import { useUser } from "@/lib/supabase/auth-context";
import { useState } from 'react'
import CommentInput from './CommentInput';
import { MessageCircle } from 'lucide-react';
import ReportButton from '@/components/ReportButton';
import DeleteButton from '../DeleteButton';

function CommentReply({
  postId,
  comment,
}: {
  postId: string;
  comment: AppComment;
}) {

  const [isReplying, setIsReplying] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <div>

      <div className='flex items-center gap-2'>

        <button
          className='flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-green-500 transition-colors mt-1 disabled:opacity-50 disabled:cursor-not-allowed'
          onClick={() => setIsReplying(!isReplying)}
          disabled={!isSignedIn}
        >
          <MessageCircle className='w-3.5 h-3.5' />
          {isReplying ? "Cancel" : isSignedIn ? "Reply" : "Sign in to reply"}
        </button>

        {/* TODO: ReportButton */}
        <ReportButton contentId={comment._id} contentType="comment" />

        {comment.author?._id && (
          <DeleteButton
            contentOwnerId={comment.author?._id}
            contentId={comment._id}
            contentType="comment"
          />
        )}

      </div>

      {isReplying && (
        <div className='mt-3 ps-2 border-s-2 border-gray-100'>
          <CommentInput postId={postId} parentCommentId={comment._id} />
        </div>
      )}

    </div>
  )
}

export default CommentReply