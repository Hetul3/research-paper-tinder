"use client";

import {
  Bookmark,
  Compass,
  FileText,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { PaperCard } from "@/components/paper-card";
import { SavedLibrary } from "@/components/saved-library";
import { TopicFilter } from "@/components/topic-filter";
import type { Paper } from "@/lib/arxiv";
import { navigateToPdf } from "@/lib/pdf-navigation";
import {
  applyDecision,
  buildDeck,
  createInitialPreferences,
  getDecisionIds,
  parseStoredPreferences,
  undoLastDecision,
  updateMaxAgeDays,
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

function timeframeLabel(maxAgeDays: number | null): string {
  if (maxAgeDays === null) return "Any time";
  if (maxAgeDays === 365) return "Past year";
  return `Past ${maxAgeDays} days`;
}

export function DiscoveryApp({ generatedAt, papers }: DiscoveryAppProps) {
  const [preferences, setPreferences] = useState<Preferences>(() =>
    typeof window === "undefined"
      ? createInitialPreferences()
      : parseStoredPreferences(window.localStorage.getItem(STORAGE_KEY)),
  );
  const [view, setView] = useState<"discover" | "saved">("discover");
  const [additionalPapers, setAdditionalPapers] = useState<Paper[]>([]);
  const [batchAttempted, setBatchAttempted] = useState(false);
  const nextBatchStart = useMemo(() => 150 + additionalPapers.length, [additionalPapers.length]);
  const allPapers = useMemo(() => {
    const byId = new Map<string, Paper>();
    for (const paper of [...papers, ...additionalPapers]) byId.set(paper.id, paper);
    return [...byId.values()];
  }, [additionalPapers, papers]);
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
    () => buildDeck(allPapers, visiblePreferences),
    [allPapers, visiblePreferences],
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
      for (const paper of allPapers) {
        if (savedIds.has(paper.id)) durablePapers.set(paper.id, paper);
      }
      return [...durablePapers.values()].filter((paper) => savedIds.has(paper.id));
    },
    [allPapers, savedIds, visiblePreferences.savedPapers],
  );

  function decide(kind: PaperDecisionKind) {
    if (!currentPaper) return;
    setPreferences((current) => applyDecision(current, currentPaper, kind));
  }

  function undo() {
    setPreferences((current) => undoLastDecision(current));
  }

  function openPdfAndAdvance() {
    if (!currentPaper) return;
    setPreferences((current) => applyDecision(current, currentPaper, "read"));
    navigateToPdf(currentPaper.pdfUrl);
  }

  useEffect(() => {
    if (view !== "discover" || currentPaper || batchAttempted || visiblePreferences.decisions.length === 0) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setBatchAttempted(true);
    });
    fetch(`/api/papers?start=${nextBatchStart}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load more papers.");
        return (await response.json()) as { papers?: Paper[] };
      })
      .then((result) => {
        if (cancelled) return;
        if (result.papers?.length) {
          setAdditionalPapers((current) => [...current, ...result.papers!]);
          setBatchAttempted(false);
        }
      })
      .catch(() => undefined)
    return () => { cancelled = true; };
  }, [batchAttempted, currentPaper, nextBatchStart, view, visiblePreferences.decisions.length]);

  const loadingMore = !currentPaper && batchAttempted && visiblePreferences.decisions.length > 0;

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

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#121715] text-[#f5efe5]">
      <div aria-hidden="true" className="ambient-glow pointer-events-none fixed inset-0" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-3 py-3 sm:px-8 sm:py-5 lg:px-10">
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

      <main className="relative z-10 mx-auto w-full max-w-7xl px-3 pb-4 sm:px-8 sm:pb-10 lg:px-10">
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
                A living stream of AI research. Keep what pulls you in, leave the
                rest, and stop whenever you’re done.
              </p>

            </aside>

            <section aria-label="Paper discovery" className="mx-auto w-full max-w-[31rem]">
              {currentPaper ? (
                <PaperCard
                  key={`${currentPaper.id}-${visiblePreferences.decisions.length}`}
                  onDecision={decide}
                  onRightSwipe={openPdfAndAdvance}
                  paper={currentPaper}
                />
              ) : (
                <div className="grid min-h-[31rem] place-items-center rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center sm:min-h-[35rem]">
                  <div className="max-w-sm">
                    <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e56b47]/15 text-[#e56b47]">
                      <Compass aria-hidden="true" size={23} />
                    </span>
                    <h1 className="mt-5 font-serif text-4xl font-semibold tracking-[-0.04em]">
                      {loadingMore ? "Finding more papers" : "You’re caught up for now"}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      {loadingMore
                        ? "Loading another batch from arXiv…"
                        : "No repeats here. Try broadening your focus or timeframe to continue."}
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
                <div className="mt-3 hidden items-center justify-center gap-3 sm:mt-5 lg:flex">
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

              {view === "discover" ? (
                <div className="mt-3 grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 lg:hidden">
                  <button
                    aria-label="Skip this paper"
                    className="grid min-h-11 min-w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70"
                    onClick={() => decide("skipped")}
                    type="button"
                  >
                    <X aria-hidden="true" size={18} />
                  </button>
                  <button
                    aria-label={`Focus, ${visiblePreferences.selectedCategories.length} topics`}
                    className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/65"
                    onClick={() => setTopicFilterOpen(true)}
                    type="button"
                  >
                    Focus
                  </button>
                  <button
                    aria-label={`Timeframe, ${timeframeLabel(visiblePreferences.maxAgeDays)}`}
                    className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/65"
                    onClick={() => setTopicFilterOpen(true)}
                    type="button"
                  >
                    {timeframeLabel(visiblePreferences.maxAgeDays)}
                  </button>
                  <button
                    aria-label="Save paper for later"
                    className="grid min-h-11 min-w-11 place-items-center rounded-2xl border border-[#e56b47]/45 bg-[#e56b47]/10 text-[#f5a38b]"
                    onClick={() => decide("saved")}
                    type="button"
                  >
                    <Bookmark aria-hidden="true" size={18} />
                  </button>
                  <button
                    aria-label="Open paper PDF"
                    className="grid min-h-11 min-w-11 place-items-center rounded-2xl bg-[#e56b47] text-white"
                    onClick={openPdfAndAdvance}
                    type="button"
                  >
                    <FileText aria-hidden="true" size={18} />
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
                  New papers arrive daily · no repeats in this batch
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

      <footer className="relative z-10 mx-auto hidden w-full max-w-7xl flex-col gap-2 border-t border-white/[0.07] px-5 py-5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-white/25 sm:flex sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <span>A calmer feed for infinite questions.</span>
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
          maxAgeDays={visiblePreferences.maxAgeDays}
          onMaxAgeDaysChange={(maxAgeDays) =>
            setPreferences((current) => updateMaxAgeDays(current, maxAgeDays))
          }
          selectedCategories={visiblePreferences.selectedCategories}
        />
      ) : null}
    </div>
  );
}
