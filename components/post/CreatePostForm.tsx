"use client";

import { ImageIcon } from "lucide-react";
import React, { useRef, useState } from "react";
import { Textarea } from "../ui/textarea";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import { createPost } from "@/action/createPost";
import { Input } from "../ui/input";
import { useUser } from "@/lib/supabase/auth-context";

function CreatePostForm() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const searchParams = useSearchParams();
  const subxeuron = searchParams.get("subxeuron");
  const publication = searchParams.get("publication");
  const event = searchParams.get("event");

  const context = subxeuron ? { type: "subxeuron" as const, value: subxeuron }
    : publication ? { type: "publication" as const, value: publication }
    : event ? { type: "event" as const, value: event }
    : null;

  if (!context) {
    return (
      <div className="text-center p-4">
        <p>No post context selected. Please go back and try again.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl p-4 rounded-lg border border-border bg-muted/30 text-center">
        <p className="text-muted-foreground">Sign in to create a post.</p>
      </div>
    );
  }

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setErrorMessage("");
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      let imageBase64: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      if (imageFile) {
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
        fileName = imageFile.name;
        fileType = imageFile.type;
      }

      const result = await createPost({
        title: title.trim(),
        subxeuronSlug: context.type === "subxeuron" ? context.value : null,
        publicationSlug: context.type === "publication" ? context.value : null,
        eventId: context.type === "event" ? context.value : null,
        body: body.trim() || undefined,
        imageBase64,
        imageFilename: fileName,
        imageContentType: fileType,
      });

      if ("error" in result && result.error) {
        setErrorMessage(result.error);
        return;
      }

      if ("post" in result && result.post) {
        resetForm();
        if (context.type === "subxeuron") {
          router.push(`/x/${context.value}`);
        } else if (context.type === "publication") {
          router.push(`/p/${context.value}?tab=discussions`);
        } else {
          router.push(`/events/${context.value}?tab=discussions`);
        }
      }
    } catch {
      setErrorMessage("Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <form onSubmit={handleCreatePost} className="space-y-4 mt-2">
        {errorMessage && (
          <div className="text-red-500 text-sm">{errorMessage}</div>
        )}

        <div className="space-y-2">
          <label htmlFor="post-title" className="text-sm font-medium">
            Title
          </label>
          <Input
            id="post-title"
            name="title"
            placeholder="Title of this post"
            className="w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="body" className="text-sm font-medium">
            Body
          </label>
          <Textarea
            id="body"
            name="body"
            placeholder="Text of this post"
            className="w-full focus:ring-2 focus:ring-blue-500"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
        </div>

        {/* Image */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Image (optional)</label>

          {imagePreview ? (
            <div className="relative w-24 h-24 mx-auto">
              <Image
                src={imagePreview}
                alt="Post preview"
                fill
                className="object-cover rounded-full"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                x
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="post-image"
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center">
                  <ImageIcon className="w-6 h-6 mb-2 text-gray-400" />
                  <p className="text-xs text-gray-500">Click to upload an image</p>
                </div>
                <input
                  id="post-image"
                  name="post-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || !user}
        >
          {isLoading ? "Creating…" : "Post"}
        </Button>
      </form>
    </div>
  );
}

export default CreatePostForm;
