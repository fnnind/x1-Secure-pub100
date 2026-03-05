'use client';

import { Flag, Trash2 } from "lucide-react";
import { useUser } from "@/lib/supabase/auth-context";
import { useState } from "react";
import { deletePost } from "@/action/deletePost";
import { deleteComment } from "@/action/deleteComment";

interface DeleteButtonProps {
  contentId: string;
  contentType: string;
  contentOwnerId: string;
}

function DeleteButton({
  contentId,
  contentType,
  contentOwnerId,
}: DeleteButtonProps) {
  const [isDeleting, setIsDeleing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn, user } = useUser();

  const handleDelete = async () => {

    if (isDeleting || !isSignedIn) return;
    if (!window.confirm("Are you sure you want to delete this?")) {
      return;
    }

    setIsDeleing(true);
    setError(null);

    // need 2 new actions for deletePost and deleteComment
    try {
      const response =
        contentType === "post"
          ? await deletePost(contentId)
          : await deleteComment(contentId);

      // Normalize both error return string and { error } response into setError
      if (typeof response === "string") {
        setError(response);
      } else if (response && "error" in response && response.error) {
        setError(response.error);
      }
    } catch (error) {
      setError("Failed to delete. Please try again");
      console.error(`Failed to delete ${contentType}`, error);
    } finally {
      setIsDeleing(false);
    }
  };

  const isOwner = contentOwnerId === user?._id;
  if (!isOwner) return null;

  return (
    <button onClick={handleDelete}
      disabled={isDeleting || !isSignedIn}
      className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors mt-1 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Trash2 size={14} />
      <span className="hidden md:block">
        {isDeleting ? "Deleting..." : isSignedIn ? "Delete" : "Sign in to delete"}
      </span>
      {error && <span className="text-red-500 ml-2">{error} </span>}
    </button>
  );
}

export default DeleteButton