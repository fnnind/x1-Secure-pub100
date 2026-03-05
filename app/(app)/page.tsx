import Link from "next/link";
import {
  TrendingUp,
  Users,
  BookOpen,
  Zap,
  ArrowRight,
  PenLine,
} from "lucide-react";
import { getSubxeurons } from "@/lib/supabase/subxeurons";
import PostsList from "@/components/post/PostsList";

const COMMUNITY_GRADIENTS = [
  {
    gradient: "from-violet-500/20 to-indigo-500/10",
    border: "hover:border-violet-500/25",
  },
  {
    gradient: "from-emerald-500/20 to-cyan-500/10",
    border: "hover:border-emerald-500/25",
  },
  {
    gradient: "from-blue-500/20 to-indigo-500/10",
    border: "hover:border-blue-500/25",
  },
  {
    gradient: "from-pink-500/20 to-rose-500/10",
    border: "hover:border-pink-500/25",
  },
] as const;

const TRENDING_TOPICS = [
  "Large Language Models",
  "CRISPR",
  "Quantum Computing",
  "Climate AI",
  "Protein Folding",
  "AlphaFold",
  "Gene Editing",
  "Neuromorphic Computing",
];

export default async function Home() {
  const subxeurons = await getSubxeurons();
  const featuredSubxeurons = subxeurons.slice(0, 8);
  const firstSlug = featuredSubxeurons[0]?.slug;

  return (
    <main className="space-y-8 animate-fade-in">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-500/[0.08] via-transparent to-violet-500/[0.05] p-8 lg:p-10 dark:border-white/[0.05] dark:from-indigo-500/[0.06] dark:to-violet-500/[0.04]">
        <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-60" />
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-30 dark:opacity-40" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            <Zap size={10} />
            The Scientific Community Network
          </div>
          <h1 className="mb-3 text-3xl font-extrabold leading-tight text-foreground lg:text-4xl">
            Discover Research,{" "}
            <span className="gradient-text">Connect with Scientists</span>
          </h1>
          <p className="mb-6 max-w-lg text-sm leading-relaxed text-muted-foreground lg:text-base">
            Xeuron brings together researchers, engineers, and students around
            cutting-edge papers, lively discussions, and open science.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={firstSlug ? `/x/${firstSlug}` : "/search"}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm transition-all duration-200 hover:from-indigo-500 hover:to-violet-500 hover:shadow-glow-primary"
            >
              Explore Communities
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/create-post"
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] dark:hover:border-white/[0.15]"
            >
              <PenLine size={14} className="text-cyan-600 dark:text-cyan-400" />
              Create Post
            </Link>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: Users,
            value: "—",
            label: "Researchers",
            color: "text-indigo-500 dark:text-indigo-400",
          },
          {
            icon: BookOpen,
            value: "—",
            label: "Posts",
            color: "text-cyan-500 dark:text-cyan-400",
          },
          {
            icon: TrendingUp,
            value: subxeurons.length > 0 ? String(subxeurons.length) : "—",
            label: "SubXeurons",
            color: "text-violet-500 dark:text-violet-400",
          },
        ].map(({ icon: Icon, value, label, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/30 p-4 text-center dark:border-white/[0.05] dark:bg-white/[0.025]"
          >
            <Icon size={18} className={color} />
            <div className="text-xl font-extrabold gradient-text">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Featured Communities (SubXeurons) */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            Featured SubXeurons
          </h2>
          {featuredSubxeurons.length > 0 && (
            <Link
              href={firstSlug ? `/x/${firstSlug}` : "/search"}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-500 transition-colors hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View all <ArrowRight size={11} />
            </Link>
          )}
        </div>
        {featuredSubxeurons.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {featuredSubxeurons.map((s, i) => {
              const style = COMMUNITY_GRADIENTS[i % COMMUNITY_GRADIENTS.length];
              return (
                <Link
                  key={s._id}
                  href={`/x/${s.slug}`}
                  className={`group rounded-xl border border-border bg-gradient-to-br ${style.gradient} p-4 transition-all duration-200 ${style.border} hover:-translate-y-0.5 hover:shadow-card dark:border-white/[0.05]`}
                >
                  <div className="text-sm font-bold text-foreground">
                    {s.title}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Open community
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground dark:border-white/8">
            No SubXeurons yet. Create one from the sidebar.
          </p>
        )}
      </section>

      {/* Trending Topics */}
      <section>
        <h2 className="mb-3 text-base font-bold text-foreground">
          Trending in Science
        </h2>
        <div className="flex flex-wrap gap-2">
          {TRENDING_TOPICS.map((topic) => (
            <Link
              key={topic}
              href={`/search?q=${encodeURIComponent(topic)}`}
              className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-600 dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:bg-indigo-500/[0.06] dark:hover:text-indigo-300"
            >
              {topic}
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Posts */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            Recent Posts
          </h2>
        </div>
        <div className="space-y-4">
          <PostsList />
        </div>
      </section>
    </main>
  );
}
