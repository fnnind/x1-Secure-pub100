'use server';

import { reportContent as reportContentDb, type ReportContentType } from "@/lib/supabase/mutations";
import { getUser } from "@/lib/supabase/user";

export async function reportContent(contentType: ReportContentType, contentId: string) {
  const user = await getUser();
  if ("error" in user) return { error: user.error };

  const result = await reportContentDb(contentType, contentId);
  return result;
}
