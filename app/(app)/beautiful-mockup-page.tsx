import Link from "next/link";
import { TrendingUp, Users, BookOpen, Zap, ArrowRight, FlaskConical } from "lucide-react";

const featuredCommunities = [
  {
    slug: "ml-research",
    name: "ML Research",
    members: "2.4K",
    gradient: "from-violet-500/20 to-indigo-500/10",
    border: "hover:border-violet-500/25",
    icon: "🤖",
  },
  {
    slug: "bioinformatics",
    name: "Bioinformatics",
    members: "1.8K",
    gradient: "from-emerald-500/20 to-cyan-500/10",
    border: "hover:border-emerald-500/25",
    icon: "🧬",
  },
  {
    slug: "theoretical-physics",
    name: "Theoretical Physics",
    members: "3.1K",
    gradient: "from-blue-500/20 to-indigo-500/10",
    border: "hover:border-blue-500/25",
    icon: "⚛️",
  },
  {
    slug: "neuroscience",
    name: "Neuroscience",
    members: "1.2K",
    gradient: "from-pink-500/20 to-rose-500/10",
    border: "hover:border-pink-500/25",
    icon: "🧠",
  },
];

const trendingTopics = [
  "Large Language Models",
  "CRISPR",
  "Quantum Computing",
  "Climate AI",
  "Protein Folding",
  "Dark Matter",
  "mRNA Vaccines",
  "Neuromorphic Computing",
  "AlphaFold",
  "Gene Editing",
];

export default function HomePage() {
  return (
    <main className="space-y-8 animate-fade-in">
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-gradient-to-br from-indigo-500/[0.06] via-transparent to-violet-500/[0.04] p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-60" />
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
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
              href="/x/popular"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm transition-all duration-200 hover:from-indigo-500 hover:to-violet-500 hover:shadow-glow-primary"
            >
              Explore Papers
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/submit-publication"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-white/[0.07] hover:border-white/[0.15]"
            >
              <FlaskConical size={14} className="text-cyan-400" />
              Submit Publication
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, value: "50K+", label: "Researchers", color: "text-indigo-400" },
          { icon: BookOpen, value: "12K+", label: "Papers", color: "text-cyan-400" },
          { icon: TrendingUp, value: "500+", label: "Communities", color: "text-violet-400" },
        ].map(({ icon: Icon, value, label, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.05] bg-white/[0.025] p-4 text-center"
          >
            <Icon size={18} className={color} />
            <div className="text-xl font-extrabold gradient-text">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Featured Communities ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            Featured Communities
          </h2>
          <Link
            href="/x/popular"
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
          >
            View all <ArrowRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {featuredCommunities.map((c) => (
            <Link
              key={c.slug}
              href={`/x/${c.slug}`}
              className={`group rounded-xl border border-white/[0.05] bg-gradient-to-br ${c.gradient} p-4 transition-all duration-200 ${c.border} hover:-translate-y-0.5 hover:shadow-card`}
            >
              <div className="mb-2 text-2xl">{c.icon}</div>
              <div className="text-sm font-bold text-foreground">{c.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {c.members} members
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Trending Topics ── */}
      <section>
        <h2 className="mb-3 text-base font-bold text-foreground">
          Trending in Science
        </h2>
        <div className="flex flex-wrap gap-2">
          {trendingTopics.map((topic) => (
            <Link
              key={topic}
              href={`/search?q=${encodeURIComponent(topic)}`}
              className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-indigo-500/30 hover:bg-indigo-500/[0.06] hover:text-indigo-300"
            >
              {topic}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Recent Discussions (skeleton placeholder) ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            Recent Discussions
          </h2>
          <span className="text-xs text-muted-foreground/50">Feed coming soon</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5"
            >
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-7 w-7 rounded-lg bg-white/[0.04] shimmer" />
                  <div className="h-4 w-4 rounded bg-white/[0.03]" />
                  <div className="h-7 w-7 rounded-lg bg-white/[0.04]" />
                </div>
                <div className="flex-1 space-y-2.5">
                  <div
                    className="h-4 rounded-md bg-white/[0.05] shimmer"
                    style={{ width: `${55 + i * 15}%` }}
                  />
                  <div
                    className="h-3 rounded-md bg-white/[0.04] shimmer"
                    style={{ width: `${35 + i * 10}%` }}
                  />
                  <div className="flex gap-2">
                    <div className="h-3 w-16 rounded-md bg-white/[0.03] shimmer" />
                    <div className="h-3 w-12 rounded-md bg-white/[0.03] shimmer" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
