import { describe, expect, it } from "vitest";

import type { Paper } from "@/lib/arxiv";
import {
  applyDecision,
  buildDeck,
  createInitialPreferences,
  getDecisionIds,
  undoLastDecision,
  updateMaxAgeDays,
} from "@/lib/preferences";

function paper(
  id: string,
  primaryCategory: string,
  publishedAt: string,
): Paper {
  return {
    id,
    versionedId: `${id}v1`,
    version: 1,
    title: `Paper ${id}`,
    abstract: "A useful abstract.",
    authors: ["Researcher"],
    publishedAt,
    updatedAt: publishedAt,
    primaryCategory,
    categories: [primaryCategory],
    abstractUrl: `https://arxiv.org/abs/${id}v1`,
    pdfUrl: `https://arxiv.org/pdf/${id}v1`,
    comment: null,
    doi: null,
    journalReference: null,
  };
}

describe("paper preferences", () => {
  it("records one current decision per paper", () => {
    const initial = createInitialPreferences();
    const saved = applyDecision(initial, paper("1", "cs.CL", "2026-08-26"), "saved");
    const changed = applyDecision(saved, paper("1", "cs.CL", "2026-08-26"), "skipped");

    expect(changed.decisions).toHaveLength(1);
    expect(getDecisionIds(changed, "saved")).toEqual([]);
    expect(getDecisionIds(changed, "skipped")).toEqual(["1"]);
  });

  it("undoes the most recent decision", () => {
    const first = applyDecision(
      createInitialPreferences(),
      paper("1", "cs.AI", "2026-08-26"),
      "saved",
    );
    const second = applyDecision(
      first,
      paper("2", "cs.CV", "2026-08-25"),
      "skipped",
    );

    const undone = undoLastDecision(second);

    expect(getDecisionIds(undone, "saved")).toEqual(["1"]);
    expect(getDecisionIds(undone, "skipped")).toEqual([]);
  });

  it("keeps a saved paper snapshot after it leaves the daily feed", () => {
    const savedPaper = paper("lasting", "cs.AI", "2026-08-26");
    const preferences = applyDecision(
      createInitialPreferences(),
      savedPaper,
      "saved",
    );

    expect(preferences.savedPapers).toEqual([savedPaper]);
    expect(buildDeck([], preferences)).toEqual([]);
    expect(preferences.savedPapers[0].title).toBe("Paper lasting");
  });

  it("builds an unseen category-filtered deck and favors saved topics", () => {
    const language = paper("language", "cs.CL", "2026-08-20");
    const recentVision = paper("vision", "cs.CV", "2026-08-27");
    const nextLanguage = paper("language-2", "cs.CL", "2026-08-19");
    const robotics = paper("robotics", "cs.RO", "2026-08-26");

    const preferences = applyDecision(
      createInitialPreferences(["cs.CL", "cs.CV"]),
      language,
      "saved",
    );

    const deck = buildDeck(
      [recentVision, robotics, language, nextLanguage],
      preferences,
    );

    expect(deck.map((item) => item.id)).toEqual(["language-2", "vision"]);
  });

  it("stops at the end of a batch instead of recycling seen papers", () => {
    const first = paper("first", "cs.AI", "2026-08-27");
    const second = paper("second", "cs.AI", "2026-08-26");
    let preferences = createInitialPreferences(["cs.AI"]);
    preferences = applyDecision(preferences, first, "skipped");
    preferences = applyDecision(preferences, second, "skipped");

    expect(buildDeck([first, second], preferences)).toEqual([]);
  });

  it("filters the continuous deck by publication timeframe", () => {
    const recent = paper("recent", "cs.AI", "2026-08-20");
    const old = paper("old", "cs.AI", "2025-01-01");
    const preferences = updateMaxAgeDays(createInitialPreferences(), 30);

    expect(
      buildDeck([old, recent], preferences, new Date("2026-08-27T00:00:00Z"))
        .map((item) => item.id),
    ).toEqual(["recent"]);
  });
});
