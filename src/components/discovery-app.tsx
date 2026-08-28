"use client";

import {
  Bookmark,
  Compass,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { PaperCard } from "@/components/paper-card";
import { SavedLibrary } from "@/components/saved-library";
import { TopicFilter } from "@/components/topic-filter";
import type { Paper } from "@/lib/arxiv";
import {
  applyDecision,
  buildDeck,
  createInitialPreferences,
  getDecisionIds,
  parseStoredPreferences,
  undoLastDecision,
  updateSelectedCategories,
  type PaperDecisionKind,
  type Preferences,
} from "@/lib/preferences";

interface DiscoveryAppProps {
  generatedAt: string;
  papers: Paper[];
}

const STORAGE_KEY = "margin-paper-preferences-v1";
const DEFAULT_PREFERENCES = createInitialPreferences();

function subscribeToHydration() {
  return () => undefined;
}

function formatRefreshDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently refreshed";

  return `Refreshed ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date)}`;
}

export function DiscoveryApp({ generatedAt, papers }: DiscoveryAppProps) {
  const [preferences, setPreferences] = useState<Preferences>(() =>
    typeof window === "undefined"
      ? createInitialPreferences()
      : parseStoredPreferences(window.localStorage.getItem(STORAGE_KEY)),
  );
  const [view, setView] = useState<"discover" | "saved">("discover");
  const [topicFilterOpen, setTopicFilterOpen] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const visiblePreferences = hydrated ? preferences : DEFAULT_PREFERENCES;

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [hydrated, preferences]);

  const deck = useMemo(
    () => buildDeck(papers, visiblePreferences),
    [papers, visiblePreferences],
  );
  const currentPaper = deck[0];
  const savedIds = useMemo(
    () => new Set(getDecisionIds(visiblePreferences, "saved")),
    [visiblePreferences],
  );
  const savedPapers = useMemo(
    () => {
      const durablePapers = new Map(
        visiblePreferences.savedPapers.map((paper) => [paper.id, paper]),
      );
      for (const paper of papers) {
        if (savedIds.has(paper.id)) durablePapers.set(paper.id, paper);
      }
      return [...durablePapers.values()].filter((paper) => savedIds.has(paper.id));
    },
    [papers, savedIds, visiblePreferences.savedPapers],
  );

  function decide(kind: PaperDecisionKind) {
    if (!currentPaper) return;
    setPreferences((current) => applyDecision(current, currentPaper, kind));
  }

  function undo() {
    setPreferences((current) => undoLastDecision(current));
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (view !== "discover" || !currentPaper) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        decide("skipped");
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        decide("saved");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const seenCount = visiblePreferences.decisions.length;
  const totalCount = papers.filter((paper) =>
    paper.categories.some((category) =>
      visiblePreferences.selectedCategories.includes(category),
    ),
  ).length;
  const progress = totalCount === 0 ? 0 : Math.min(100, (seenCount / totalCount) * 100);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#121715] text-[#f5efe5]">
      <div aria-hidden="true" className="ambient-glow pointer-events-none fixed inset-0" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <button
          aria-label="Open Discover"
          className="group inline-flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e56b47]"
          onClick={() => setView("discover")}
          type="button"
        >
          <span className="grid size-9 place-items-center rounded-full border border-white/15 bg-white/[0.06] font-serif text-lg italic text-[#e56b47] transition group-hover:border-[#e56b47]/50">
            m
          </span>
          <span>
            <span className="block font-serif text-lg font-semibold leading-none tracking-[-0.02em]">
              margin
            </span>
            <span className="mt-1 hidden font-mono text-[0.57rem] uppercase tracking-[0.18em] text-white/35 sm:block">
              read at your own pace
            </span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <nav aria-label="Primary" className="flex items-center gap-1 rounded-full border border-white/10 bg-black/15 p-1">
          <button
            aria-current={view === "discover" ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-[#e56b47] sm:px-4 ${
              view === "discover"
                ? "bg-[#f5efe5] text-[#171713]"
                : "text-white/55 hover:text-white"
            }`}
            onClick={() => setView("discover")}
            type="button"
          >
            <Compass aria-hidden="true" size={15} />
            Discover
          </button>
          <button
            aria-current={view === "saved" ? "page" : undefined}
            aria-label={`Saved papers, ${savedPapers.length}`}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-[#e56b47] sm:px-4 ${
              view === "saved"
                ? "bg-[#f5efe5] text-[#171713]"
                : "text-white/55 hover:text-white"
            }`}
            onClick={() => setView("saved")}
            type="button"
          >
            <Bookmark aria-hidden="true" size={15} />
            Saved
            <span className="font-mono text-[0.65rem] opacity-60">
              {savedPapers.length}
            </span>
          </button>
          </nav>
          <button
            aria-label="Tune topics"
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/45 transition hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e56b47]"
            onClick={() => setTopicFilterOpen(true)}
            type="button"
          >
            <Settings2 aria-hidden="true" size={16} />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-10 sm:px-8 lg:px-10">
        {view === "discover" ? (
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(22rem,31rem)_minmax(15rem,0.7fr)] lg:gap-10">
            <aside className="hidden lg:block">
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-[#e56b47]">
                Today’s frontier
              </p>
              <h2 className="mt-4 max-w-[12ch] font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.045em]">
                Curiosity,
                <br />
                without the noise.
              </h2>
              <p className="mt-6 max-w-xs text-sm leading-6 text-white/45">
                A finite stack of new AI research. Keep what pulls you in, leave
                the rest, and stop when you’re done.
              </p>

              <div className="mt-9 max-w-xs">
                <div className="flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-[0.12em] text-white/35">
                  <span>Session</span>
                  <span>
                    {seenCount} / {totalCount}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#e56b47] transition-[width] duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </aside>

            <section aria-label="Paper discovery" className="mx-auto w-full max-w-[31rem]">
              {currentPaper ? (
                <PaperCard
                  key={currentPaper.id}
                  onDecision={decide}
                  paper={currentPaper}
                />
              ) : (
                <div className="grid min-h-[31rem] place-items-center rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center sm:min-h-[35rem]">
                  <div className="max-w-sm">
                    <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e56b47]/15 text-[#e56b47]">
                      <Compass aria-hidden="true" size={23} />
                    </span>
                    <h1 className="mt-5 font-serif text-4xl font-semibold tracking-[-0.04em]">
                      You’re all caught up
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      That’s the end of this stack. The point is to finish—not to
                      scroll forever.
                    </p>
                    {visiblePreferences.decisions.length > 0 ? (
                      <button
                        aria-label="Undo last choice"
                        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e56b47]"
                        onClick={undo}
                        type="button"
                      >
                        <RotateCcw aria-hidden="true" size={17} />
                        Bring one back
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {currentPaper ? (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    aria-label="Skip paper"
                    className="grid size-13 place-items-center rounded-full border border-white/15 bg-white/[0.045] text-white/70 transition hover:scale-105 hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e56b47] motion-reduce:hover:scale-100"
                    onClick={() => decide("skipped")}
                    type="button"
                  >
                    <X aria-hidden="true" size={22} strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label="Undo last choice"
                    className="grid size-10 place-items-center rounded-full text-white/35 transition hover:bg-white/[0.06] hover:text-white/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e56b47] disabled:pointer-events-none disabled:opacity-20"
                    disabled={visiblePreferences.decisions.length === 0}
                    onClick={undo}
                    type="button"
                  >
                    <RotateCcw aria-hidden="true" size={17} />
                  </button>
                  <button
                    aria-label="Save paper"
                    className="grid size-13 place-items-center rounded-full bg-[#e56b47] text-white shadow-[0_12px_30px_rgba(213,85,50,0.28)] transition hover:scale-105 hover:bg-[#f17852] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5efe5] motion-reduce:hover:scale-100"
                    onClick={() => decide("saved")}
                    type="button"
                  >
                    <Bookmark aria-hidden="true" size={21} strokeWidth={1.8} />
                  </button>
                </div>
              ) : null}
            </section>

            <aside className="hidden lg:block lg:pl-4">
              <div className="border-l border-white/10 pl-6">
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-white/35">
                  Quiet controls
                </p>
                <dl className="mt-5 grid gap-4 text-sm">
                  <div className="flex items-center justify-between gap-5">
                    <dt className="text-white/45">Skip</dt>
                    <dd className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[0.65rem] text-white/65">
                      ←
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-5">
                    <dt className="text-white/45">Save</dt>
                    <dd className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[0.65rem] text-white/65">
                      →
                    </dd>
                  </div>
                </dl>
                <p className="mt-8 font-mono text-[0.62rem] uppercase leading-5 tracking-[0.13em] text-white/25">
                  {formatRefreshDate(generatedAt)}
                  <br />
                  New papers arrive daily
                </p>
                <p className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-white/35">
                  <Settings2 aria-hidden="true" size={15} />
                  {visiblePreferences.selectedCategories.length} topics selected
                </p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl py-6 sm:py-10">
            <SavedLibrary papers={savedPapers} />
          </div>
        )}
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-2 border-t border-white/[0.07] px-5 py-5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-white/25 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <span>A finite feed for infinite questions.</span>
        <span>Thank you to arXiv for use of its open access interoperability.</span>
      </footer>

      {topicFilterOpen ? (
        <TopicFilter
          onChange={(categories) =>
            setPreferences((current) =>
              updateSelectedCategories(current, categories),
            )
          }
          onClose={() => setTopicFilterOpen(false)}
          selectedCategories={visiblePreferences.selectedCategories}
        />
      ) : null}
    </div>
  );
}
