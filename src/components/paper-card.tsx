"use client";

import {
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  FileText,
  Sparkles,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";

import type { Paper } from "@/lib/arxiv";

interface PaperCardProps {
  paper: Paper;
  onDecision: (decision: "saved" | "skipped") => void;
  onRightSwipe?: () => void;
}

function abstractExcerpt(abstract: string): string {
  const sentences = abstract.match(/[^.!?]+[.!?]+/g) ?? [abstract];
  const excerpt = sentences.slice(0, 2).join(" ").replace(/\s+/g, " ").trim();

  if (excerpt.length <= 280) return excerpt;
  return `${excerpt.slice(0, 277).trimEnd()}…`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function PaperCard({ paper, onDecision, onRightSwipe }: PaperCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const excerpt = useMemo(() => abstractExcerpt(paper.abstract), [paper.abstract]);

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, a")) return;
    startX.current = event.clientX;
    dragXRef.current = 0;
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (startX.current === null) return;
    const nextDragX = event.clientX - startX.current;
    dragXRef.current = nextDragX;
    setDragX(nextDragX);
  }

  function handlePointerUp() {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);

    if (dragXRef.current > 100) {
      if (onRightSwipe) onRightSwipe();
      else onDecision("saved");
    } else if (dragXRef.current < -100) {
      onDecision("skipped");
    }

    dragXRef.current = 0;
    setDragX(0);
  }

  return (
    <article
      className="paper-card relative isolate flex h-[calc(100dvh-10.75rem)] min-h-[30rem] w-full select-none touch-pan-y flex-col overflow-hidden rounded-[1.55rem] border border-white/70 bg-[#f2eadc] p-5 text-[#171713] shadow-[0_28px_80px_rgba(0,0,0,0.38)] cursor-grab active:cursor-grabbing sm:h-auto sm:min-h-[35rem] sm:select-auto sm:rounded-[2rem] sm:p-8"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translateX(${dragX}px) rotate(${dragX / 28}deg)`,
        transition: dragging ? "none" : "transform 220ms ease",
        touchAction: "pan-y",
      }}
    >
      <div aria-hidden="true" className="paper-grid absolute inset-0 -z-10 opacity-40" />

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 grid place-items-center text-2xl font-bold uppercase tracking-[0.25em] transition-opacity ${
          dragX > 45 ? "bg-[#d95d39]/90 text-white opacity-100" : "opacity-0"
        }`}
      >
        Open PDF
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 grid place-items-center text-2xl font-bold uppercase tracking-[0.25em] transition-opacity ${
          dragX < -45 ? "bg-[#1d2926]/90 text-white opacity-100" : "opacity-0"
        }`}
      >
        Skip
      </div>

      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#171713] px-3 py-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-[#f5efe5]">
            <Sparkles aria-hidden="true" size={12} />
            {paper.primaryCategory}
          </span>
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-[#6d695f]">
            {formatDate(paper.publishedAt)}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[0.68rem] text-[#888174]">
          {paper.versionedId}
        </span>
      </header>

      <div className="mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#d45532]">
          New research
        </p>
        <h1 className="max-w-[18ch] text-balance font-serif text-[2.15rem] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[2.85rem]">
          {paper.title}
        </h1>
        <p className="mt-5 max-w-[52ch] text-sm font-medium leading-6 text-[#57534a]">
          {paper.authors.join(" · ")}
        </p>

        <div className="my-6 h-px bg-[#171713]/15" />

        <p className="text-[0.98rem] leading-7 text-[#3f3c35]">
          {expanded ? paper.abstract : excerpt}
        </p>

        {expanded ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#d45532] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b94325] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d45532]"
              href={paper.pdfUrl}
              rel="noreferrer"
              target="_blank"
            >
              <FileText aria-hidden="true" size={17} />
              Open PDF
              <ArrowUpRight aria-hidden="true" size={15} />
            </a>
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#171713]/20 px-4 py-2 text-sm font-semibold transition hover:bg-[#171713]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171713]"
              href={paper.abstractUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" size={16} />
              Open on arXiv
            </a>
          </div>
        ) : null}
      </div>

      <footer className="mt-4 flex shrink-0 items-end justify-between gap-4 border-t border-[#171713]/10 pt-4 sm:mt-6 sm:border-0 sm:pt-0">
        <button
          aria-expanded={expanded}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#171713]/20 px-4 py-2 text-sm font-semibold transition hover:bg-[#171713]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171713]"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          <BookOpen aria-hidden="true" size={17} />
          {expanded ? "Close abstract" : "Read full abstract"}
        </button>

        <div className="hidden items-center gap-2 text-right font-mono text-[0.64rem] uppercase leading-4 tracking-[0.12em] text-[#888174] sm:flex">
          <span>Swipe</span>
          <span aria-hidden="true">← skip · save →</span>
        </div>
      </footer>
    </article>
  );
}
