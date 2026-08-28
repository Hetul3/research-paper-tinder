import { ArrowUpRight, Bookmark, Library } from "lucide-react";

import type { Paper } from "@/lib/arxiv";

interface SavedLibraryProps {
  papers: Paper[];
}

export function SavedLibrary({ papers }: SavedLibraryProps) {
  if (papers.length === 0) {
    return (
      <section className="grid min-h-[28rem] place-items-center rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#d45532]/15 text-[#e56b47]">
            <Bookmark aria-hidden="true" size={22} />
          </div>
          <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-[#f5efe5]">
            Your reading list is quiet
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Save a paper from Discover and it will wait here—without a streak,
            badge, or countdown.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="saved-heading">
      <div className="mb-6 flex items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[#e56b47]">
            Your shelf
          </p>
          <h1
            className="mt-2 font-serif text-4xl font-semibold tracking-[-0.035em] text-[#f5efe5]"
            id="saved-heading"
          >
            Saved for later
          </h1>
        </div>
        <span className="hidden items-center gap-2 font-mono text-xs text-white/45 sm:inline-flex">
          <Library aria-hidden="true" size={15} />
          {papers.length} {papers.length === 1 ? "paper" : "papers"}
        </span>
      </div>

      <div className="grid gap-3">
        {papers.map((paper, index) => (
          <article
            className="group rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition hover:border-white/20 hover:bg-white/[0.065] sm:p-6"
            key={paper.id}
          >
            <div className="flex gap-4 sm:gap-6">
              <span className="mt-1 font-mono text-xs text-white/30">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-white/45">
                  <span className="text-[#e56b47]">{paper.primaryCategory}</span>
                  <span aria-hidden="true">/</span>
                  <span>{paper.versionedId}</span>
                </div>
                <h2 className="mt-3 max-w-3xl font-serif text-2xl font-semibold leading-tight tracking-[-0.025em] text-[#f5efe5] sm:text-3xl">
                  {paper.title}
                </h2>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/50">
                  {paper.abstract}
                </p>
                <a
                  className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#f5efe5] underline decoration-white/20 underline-offset-4 transition group-hover:decoration-[#e56b47] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e56b47]"
                  href={paper.abstractUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Read on arXiv
                  <ArrowUpRight aria-hidden="true" size={16} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
