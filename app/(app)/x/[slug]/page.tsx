import Post from "@/components/post/Post";
import { toPublicImageUrl, toPublicContentUrl } from "@/lib/image";
import { getPostsForSubxeuron } from "@/lib/supabase/posts";
import { getSubxeuronBySlug } from "@/lib/supabase/subxeurons";
import { getUser } from "@/lib/supabase/user";
import type { AppSubxeuron } from "@/lib/supabase/types";
import Image from "next/image";
import Link from "next/link";
import { FileText, PenLine } from "lucide-react";
import TimeAgo from "@/components/TimeAgo";
import { ShareButton } from "@/components/ShareButton";

function SubxeuronBanner({ subxeuron }: { subxeuron: AppSubxeuron }) {
  const imageUrl = subxeuron.image_url;

  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {imageUrl && (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <Image
                src={toPublicImageUrl(imageUrl)}
                alt={subxeuron.image_alt || `${subxeuron.title} subxeuron`}
                fill
                className="object-cover"
                priority
                sizes="96px"
              />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {subxeuron.title}
            </h1>
            <p className="text-xs text-gray-500">
              - {subxeuron.moderator && (
                <>
                  {" "}
                  created by{" "}
                  <Link
                    href={`/u/${subxeuron.moderator.username}`}
                    className="font-medium text-gray-700 hover:underline"
                  >
                    u/{subxeuron.moderator.username}
                  </Link>
                </>
              )}
              {subxeuron.created_at && (
                <>
                  {" – "}
                  <TimeAgo date={new Date(subxeuron.created_at)} />
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span className="text-gray-500">URL:</span>
              <Link
                href={`/x/${subxeuron.slug}`}
                className="text-gray-600 hover:underline"
              >
                https://xeuron.com/x/{subxeuron.slug}
              </Link>
              <ShareButton path={`/x/${subxeuron.slug}`} />
              {subxeuron.source_url && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">Source:</span>
                  <a
                    href={subxeuron.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:underline"
                  >
                    {subxeuron.source_url.length > 50
                      ? `${subxeuron.source_url.slice(0, 47)}…`
                      : subxeuron.source_url}
                  </a>
                </>
              )}
              {subxeuron.pdf_url && (
                <>
                  <span className="text-gray-400">·</span>
                  <a
                    href={toPublicContentUrl(subxeuron.pdf_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <FileText className="h-4 w-4 shrink-0" aria-hidden />
                    PDF
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

async function SubXeuronPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const subXeuron = await getSubxeuronBySlug(slug);

  if (!subXeuron) return null;

  const user = await getUser();
  const userId = "error" in user ? null : user._id;
  const posts = await getPostsForSubxeuron(subXeuron._id);

  return (
    <>
      <SubxeuronBanner subxeuron={subXeuron} />

      <section className="my-8">
        <div className="mx-auto max-w-7xl px-4">
          {userId && (
            <div className="mb-4">
              <Link
                href={`/create-post?subxeuron=${subXeuron.slug}`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <PenLine size={14} className="text-cyan-600 dark:text-cyan-400" />
                + Create Post
              </Link>
            </div>
          )}
          {posts.length > 0 ? (
            posts.map((post) => (
              <Post key={post._id} post={post} userId={userId} />
            ))
          ) : (
            <div className="rounded-md bg-white p-6 text-center">
              <p className="text-gray-500">No posts in this subXeuron yet</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default SubXeuronPage;
