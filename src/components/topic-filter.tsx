"use client";

import { Check, X } from "lucide-react";
import { useEffect } from "react";

import { AI_CATEGORIES } from "@/lib/arxiv";

interface TopicFilterProps {
  maxAgeDays: number | null;
  onChange: (categories: string[]) => void;
  onClose: () => void;
  onMaxAgeDaysChange: (maxAgeDays: number | null) => void;
  selectedCategories: string[];
}

const TIMEFRAMES = [
  { label: "Any time", value: null },
  { label: "Past 7 days", value: 7 },
  { label: "Past 30 days", value: 30 },
  { label: "Past 90 days", value: 90 },
  { label: "Past year", value: 365 },
] as const;

const TOPIC_LABELS: Record<(typeof AI_CATEGORIES)[number], string> = {
  "cs.AI": "Artificial intelligence",
  "cs.LG": "Machine learning",
  "cs.CL": "Language",
  "cs.CV": "Computer vision",
  "cs.RO": "Robotics",
  "cs.MA": "Multi-agent systems",
  "cs.NE": "Neural systems",
  "stat.ML": "Statistical ML",
};

export function TopicFilter({
  maxAgeDays,
  onChange,
  onClose,
  onMaxAgeDaysChange,
  selectedCategories,
}: TopicFilterProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function toggle(category: string) {
    if (selectedCategories.includes(category)) {
      if (selectedCategories.length === 1) return;
      onChange(selectedCategories.filter((value) => value !== category));
      return;
    }

    onChange([...selectedCategories, category]);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/65 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        aria-labelledby="topic-filter-heading"
        aria-modal="true"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#1a211e] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem] sm:p-8"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[#e56b47]">
              Shape the stack
            </p>
            <h2
              className="mt-2 font-serif text-3xl font-semibold tracking-[-0.035em]"
              id="topic-filter-heading"
            >
              Tune your topics
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
              Choose what belongs in your daily reading stack. You can change this
              anytime.
            </p>
          </div>
          <button
            aria-label="Close topic settings"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#e56b47]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          {AI_CATEGORIES.map((category) => {
            const checked = selectedCategories.includes(category);

            return (
              <label
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  checked
                    ? "border-[#e56b47]/50 bg-[#e56b47]/10 text-white"
                    : "border-white/10 bg-white/[0.025] text-white/45 hover:border-white/20 hover:text-white/70"
                }`}
                key={category}
              >
                <input
                  aria-label={TOPIC_LABELS[category]}
                  checked={checked}
                  className="peer sr-only"
                  disabled={checked && selectedCategories.length === 1}
                  onChange={() => toggle(category)}
                  type="checkbox"
                />
                <span
                  aria-hidden="true"
                  className={`grid size-5 place-items-center rounded-md border ${
                    checked
                      ? "border-[#e56b47] bg-[#e56b47] text-white"
                      : "border-white/20"
                  }`}
                >
                  {checked ? <Check size={13} strokeWidth={3} /> : null}
                </span>
                <span className="flex-1">{TOPIC_LABELS[category]}</span>
                <span className="font-mono text-[0.58rem] uppercase tracking-wider opacity-45">
                  {category}
                </span>
              </label>
            );
          })}
        </div>

        <fieldset className="mt-7 border-t border-white/10 pt-6">
          <legend className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-white/45">
            Publication timeframe
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIMEFRAMES.map((timeframe) => {
              const checked = maxAgeDays === timeframe.value;

              return (
                <label
                  className={`cursor-pointer rounded-full border px-4 py-2.5 text-xs font-semibold transition ${
                    checked
                      ? "border-[#e56b47] bg-[#e56b47] text-white"
                      : "border-white/10 bg-white/[0.025] text-white/45 hover:text-white"
                  }`}
                  key={timeframe.label}
                >
                  <input
                    aria-label={timeframe.label}
                    checked={checked}
                    className="sr-only"
                    name="timeframe"
                    onChange={() => onMaxAgeDaysChange(timeframe.value)}
                    type="radio"
                  />
                  {timeframe.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-7 flex items-center justify-between gap-4">
          <button
            className="min-h-11 text-xs font-semibold text-white/40 underline decoration-white/15 underline-offset-4 transition hover:text-white/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e56b47]"
            onClick={() => onChange([...AI_CATEGORIES])}
            type="button"
          >
            Select all
          </button>
          <button
            className="min-h-11 rounded-full bg-[#f5efe5] px-6 text-sm font-semibold text-[#171713] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e56b47]"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
