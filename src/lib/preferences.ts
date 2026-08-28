import { AI_CATEGORIES, type Paper } from "@/lib/arxiv";

export type PaperDecisionKind = "saved" | "skipped" | "read";

export interface PaperDecision {
  paperId: string;
  kind: PaperDecisionKind;
  categories: string[];
  decidedAt: string;
}

export interface Preferences {
  version: 1;
  selectedCategories: string[];
  decisions: PaperDecision[];
}

export function createInitialPreferences(
  selectedCategories: readonly string[] = AI_CATEGORIES,
): Preferences {
  return {
    version: 1,
    selectedCategories: [...selectedCategories],
    decisions: [],
  };
}

export function applyDecision(
  preferences: Preferences,
  paper: Paper,
  kind: PaperDecisionKind,
): Preferences {
  const previousDecisions = preferences.decisions.filter(
    (decision) => decision.paperId !== paper.id,
  );

  return {
    ...preferences,
    decisions: [
      ...previousDecisions,
      {
        paperId: paper.id,
        kind,
        categories: paper.categories,
        decidedAt: new Date().toISOString(),
      },
    ],
  };
}

export function undoLastDecision(preferences: Preferences): Preferences {
  if (preferences.decisions.length === 0) return preferences;

  return {
    ...preferences,
    decisions: preferences.decisions.slice(0, -1),
  };
}

export function getDecisionIds(
  preferences: Preferences,
  kind: PaperDecisionKind,
): string[] {
  return preferences.decisions
    .filter((decision) => decision.kind === kind)
    .map((decision) => decision.paperId);
}

function affinityScore(paper: Paper, preferences: Preferences): number {
  return preferences.decisions.reduce((score, decision) => {
    if (decision.kind === "skipped") return score;

    const sharedCategories = decision.categories.filter((category) =>
      paper.categories.includes(category),
    ).length;
    const weight = decision.kind === "read" ? 75 : 100;

    return score + sharedCategories * weight;
  }, 0);
}

export function buildDeck(
  papers: readonly Paper[],
  preferences: Preferences,
): Paper[] {
  const decidedIds = new Set(
    preferences.decisions.map((decision) => decision.paperId),
  );
  const selected = new Set(preferences.selectedCategories);

  return papers
    .filter((paper) => !decidedIds.has(paper.id))
    .filter((paper) => paper.categories.some((category) => selected.has(category)))
    .sort((left, right) => {
      const affinityDifference =
        affinityScore(right, preferences) - affinityScore(left, preferences);

      if (affinityDifference !== 0) return affinityDifference;

      return (
        new Date(right.publishedAt).getTime() -
        new Date(left.publishedAt).getTime()
      );
    });
}

export function updateSelectedCategories(
  preferences: Preferences,
  selectedCategories: readonly string[],
): Preferences {
  return {
    ...preferences,
    selectedCategories: [...selectedCategories],
  };
}

export function parseStoredPreferences(value: string | null): Preferences {
  if (!value) return createInitialPreferences();

  try {
    const parsed = JSON.parse(value) as Partial<Preferences>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.selectedCategories) ||
      !Array.isArray(parsed.decisions)
    ) {
      return createInitialPreferences();
    }

    const selectedCategories = parsed.selectedCategories.filter(
      (category): category is string => typeof category === "string",
    );
    const decisions = parsed.decisions.filter(
      (decision): decision is PaperDecision =>
        typeof decision === "object" &&
        decision !== null &&
        typeof decision.paperId === "string" &&
        ["saved", "skipped", "read"].includes(decision.kind) &&
        Array.isArray(decision.categories) &&
        typeof decision.decidedAt === "string",
    );

    return {
      version: 1,
      selectedCategories:
        selectedCategories.length > 0
          ? selectedCategories
          : [...AI_CATEGORIES],
      decisions,
    };
  } catch {
    return createInitialPreferences();
  }
}
