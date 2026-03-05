'use client';

import { Flag } from "lucide-react";
import { useUser } from "@/lib/supabase/auth-context";
import { useState } from "react";
import { reportContent } from "@/action/reportContent";
import type { ReportContentType } from "@/lib/supabase/mutations";

interface ReportButtonProps {
  contentId: string;
  contentType: ReportContentType;
}

function ReportButton({ contentId, contentType }: ReportButtonProps) {
  const [isReported, setIsReported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isSignedIn } = useUser();

  // only show you have reported, to prevent abuse or bias reporting
  const handleReport = async () => {
    if (isLoading || isReported || !isSignedIn) return;
    setIsLoading(true);

    try {
      const response = await reportContent(contentType, contentId);
      if (response.error) {
        // if error, revert optimistic update
        setIsReported(false);
        console.error("Error reporting content:", response.error);
      }
    } catch (error) {
      // if error, revert optimistic update
      setIsReported(false);
      console.error("Error reporting content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleReport}
      disabled={isLoading || isReported || !isSignedIn}
      className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors mt-1 disabled:opacity-50 disabled:cursor-not-allowed
        ${isReported ? "text-red-600 dark:text-red-400" : ""
        }`}
    // title={isReported ? "Reported" : "Report"}
    >
      <Flag size={14}
        className={isReported ? "fill-red-600 dark:fill-red-400" : ""}
      />
      <span className="hidden md:block text-xs font-medium">
        {isReported ? "Reported" : isSignedIn ? "Report" : "Sign in to report"}
      </span>
    </button>
  );
}

export default ReportButton;
