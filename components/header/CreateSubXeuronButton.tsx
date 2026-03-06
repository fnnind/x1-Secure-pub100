"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useUser } from "@/lib/supabase/auth-context";

import { ImageIcon, FileTextIcon, Plus } from "lucide-react";
import React, { useRef, useState, useTransition } from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import Image from "next/image";
import { Button } from "../ui/button";
import { createSubXeuron } from "@/action/createSubXeuron";
import { uploadPdfToS3 } from "@/action/uploadPdfToS3";
import { useRouter } from "next/navigation";


function CreateSubXeuronButton() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePdf = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl(null);
    setPdfFile(null);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setErrorMessage("Please select a PDF file");
        return;
      }
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      setPdfFile(file);
      setPdfPreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    // Auto generate slug from name
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 21)
      .replace(/-+$/, "") // remove trailing hyphens 
  }

  const ALLOWED_SOURCE_HOSTS = ["doi.org", "arxiv.org", "nature.com"] as const;

  const isAllowedSourceUrl = (value: string): boolean => {
    if (!value.trim()) return true;
    try {
      const url = value.startsWith("http") ? value : `https://${value}`;
      const host = new URL(url).hostname.toLowerCase();
      return ALLOWED_SOURCE_HOSTS.some(
        (allowed) => host === allowed || host.endsWith(`.${allowed}`)
      );
    } catch {
      return false;
    }
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setSourceUrl("");
    setErrorMessage("");
    setImagePreview("");
    setImageFile(null);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl(null);
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  }

  const handleCreateSubXeuron = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMessage("SubXeuron name is required");
      return;
    }
    if (!slug.trim()) {
      setErrorMessage("SubXeuron slug is required");
      return;
    }
    if (!sourceUrl.trim()) {
      setErrorMessage("Source URL is required");
      return;
    }
    if (!isAllowedSourceUrl(sourceUrl)) {
      setErrorMessage("Source URL must be from doi.org, arxiv.org, or nature.com");
      return;
    }
    setErrorMessage("");

    startTransition(async () => {
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

        let pdfUrl: string | undefined;
        if (pdfFile) {
          const pdfDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(pdfFile);
          });
          const uploadResult = await uploadPdfToS3(pdfDataUrl, pdfFile.name);
          if ("error" in uploadResult) {
            setErrorMessage(uploadResult.error);
            return;
          }
          pdfUrl = uploadResult.url;
        }

        const result = await createSubXeuron(
          name.trim(),
          imageBase64,
          fileName,
          fileType,
          sourceUrl.trim(),
          slug.trim(),
          description.trim() || undefined,
          pdfUrl
        );

        if ("error" in result && result.error) {
          setErrorMessage(result.error);
        } else if ("subxeuron" in result && result.subxeuron) {
          setOpen(false);
          resetForm();

          // After subXeuron is created, navigate to its page (slug is a string in AppSubxeuron).
          const slug = result.subxeuron.slug;
          router.push(slug ? `/x/${slug}` : "/")
          // router.refresh();  not neccessary
        }
      } catch (error) {
        console.error("Failed to create subXeuron", error);
        setErrorMessage("Failed to create subXeuron");
      }
    });
  };



  return (
    <Dialog open={open} onOpenChange={setOpen} >
      <DialogTrigger className="w-full p-2 pl-5 flex items-center rounded-md cursor-pointer bg-black text-white hover:bg-black transition-all duration-200 disabled:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={!user}
      suppressHydrationWarning
      >
        <Plus className="mr-2 h-4 w-4 shrink-0" />
        <span suppressHydrationWarning>
          {user ? "Create new SubXeuron" : "Sign in to create subXeuron"}
        </span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create SubXeuron</DialogTitle>
          <DialogDescription>
            Create a subXeuron to share ideas and get feedback.
          </DialogDescription>
          <form onSubmit={handleCreateSubXeuron} className="space-y-4 mt-2">
            {errorMessage && (
              <div className="text-red-500 text-sm">{errorMessage}</div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                SubXeuron Name - max 21 characters
              </label>
              <Input
                id="name"
                name="name"
                placeholder="My SubXeuron"
                className="w-full focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={handleNameChange}
                required
                minLength={3}
                maxLength={21}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium">
                SubXeuron Slug (URL) - max 21 characters
              </label>
              <Input
                id="slug"
                name="slug"
                placeholder="my subXeuron"
                className="w-full focus:ring-2 focus:ring-blue-500"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                minLength={3}
                maxLength={21}
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers and hyphens only"
              />
              <p className="text-xs text-gray-500">
                This will be used in the URL: xeuron.com/x/
                {slug || "subXeuron-slug"}
              </p>


            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                placeholder="Whats this subXeuron is about"
                className="w-full focus:ring-2 focus:ring-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="sourceUrl" className="text-sm font-medium">
                Source URL (doi.org, arxiv.org or nature.com)
              </label>
              <Input
                id="sourceUrl"
                name="sourceUrl"
                type="url"
                placeholder="https://doi.org/... or https://arxiv.org/... or https://nature.com/..."
                className="w-full focus:ring-2 focus:ring-blue-500"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                Required. Only doi.org, arxiv.org, or nature.com
              </p>
            </div>

            {/* PDF upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                PDF (optional max 8MB) – uploaded to S3
              </label>
              {pdfPreviewUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-600 truncate">
                      {pdfFile?.name}
                    </p>
                    <button
                      type="button"
                      onClick={removePdf}
                      className="shrink-0 rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 overflow-hidden">
                    <iframe
                      title="PDF preview"
                      src={pdfPreviewUrl}
                      className="w-full h-[240px]"
                    />
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="subXeuron-pdf"
                  className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <FileTextIcon className="w-6 h-6 mb-1 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    Click to upload a PDF
                  </p>
                  <input
                    id="subXeuron-pdf"
                    name="subXeuron-pdf"
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    ref={pdfInputRef}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Image */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                SubXeuron Image (optional)
              </label>

              {imagePreview ? (
                <div className="relative w-24 h-24 mx-auto">
                  <Image
                    src={imagePreview}
                    alt="SubXeuron preview"
                    fill className="object-cover rounded-full"
                  />
                  <button type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    x
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="subXeuron-image"
                    className="flex flex-col items-center justify-centerw-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <ImageIcon className="w-6 h-6 mb-2 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        Click to upload an image
                      </p>
                    </div>
                    <input id="subXeuron-image"
                      name="subXeuron-image"
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
              disabled={isPending || !user || !name.trim() || !slug.trim() || !sourceUrl.trim()}
            >
              {isPending
                ? "Creating"
                : user
                  ? "Create SubXeuron"
                  : "Sign in to create subXeuron"}
            </Button>

          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

export default CreateSubXeuronButton