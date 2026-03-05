// Server action: creates subxeuron via Supabase (no API route needed).
'use server'
import { getUser } from "@/lib/supabase/user";
import { createSubxeuron } from "@/lib/supabase/mutations";

export type ImageData = {
  base64: string;
  filename: string;
  contentType: string;
} | null;

export async function createSubXeuron(
  name: string,
  imageBase64: string | null | undefined,
  imageFilename: string | null | undefined,
  imageContentType: string | null | undefined,
  sourceUrl: string,
  slug?: string,
  description?: string,
  pdfUrl?: string
) {
  try {
    const user = await getUser();
    if ("error" in user) {
      return { error: user.error };
    }
    if (!sourceUrl?.trim()) {
      return { error: "Source URL is required" };
    }

    // Prepare image data if provided
    let imageData: ImageData = null;
    if (imageBase64 && imageFilename && imageContentType) {
      imageData = {
        base64: imageBase64,
        filename: imageFilename,
        contentType: imageContentType,
      };
    }

    const result = await createSubxeuron(
      name,
      user._id,
      imageData,
      sourceUrl.trim(),
      slug ?? undefined,
      description ?? undefined,
      pdfUrl
    );
    if ("error" in result) return result;
    if ("subxeuron" in result && result.subxeuron) {
      return { subxeuron: result.subxeuron };
    }
    return result;


  } catch (error) {
    console.error("Error in createSubXeuron:", error);
    return { error: "Failed to create subXeuron" };
  }
}
