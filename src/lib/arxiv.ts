import { XMLParser } from "fast-xml-parser";

export const AI_CATEGORIES = [
  "cs.AI",
  "cs.LG",
  "cs.CL",
  "cs.CV",
  "cs.RO",
  "cs.MA",
  "cs.NE",
  "stat.ML",
] as const;

export type AiCategory = (typeof AI_CATEGORIES)[number];

export interface Paper {
  id: string;
  versionedId: string;
  version: number;
  title: string;
  abstract: string;
  authors: string[];
  publishedAt: string;
  updatedAt: string;
  primaryCategory: string;
  categories: string[];
  abstractUrl: string;
  pdfUrl: string;
  comment: string | null;
  doi: string | null;
  journalReference: string | null;
}

interface AtomAuthor {
  name?: unknown;
}

interface AtomLink {
  href?: unknown;
  rel?: unknown;
  title?: unknown;
  type?: unknown;
}

interface AtomCategory {
  term?: unknown;
}

interface AtomEntry {
  id?: unknown;
  title?: unknown;
  summary?: unknown;
  published?: unknown;
  updated?: unknown;
  author?: AtomAuthor | AtomAuthor[];
  link?: AtomLink | AtomLink[];
  category?: AtomCategory | AtomCategory[];
  "arxiv:primary_category"?: AtomCategory;
  "arxiv:comment"?: unknown;
  "arxiv:doi"?: unknown;
  "arxiv:journal_ref"?: unknown;
}

interface AtomDocument {
  feed?: {
    entry?: AtomEntry | AtomEntry[];
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeArxivUrl(value: unknown, kind: "abs" | "pdf"): string {
  const raw = cleanText(value);

  try {
    const parsed = new URL(raw);
    if (
      (parsed.hostname === "arxiv.org" || parsed.hostname === "www.arxiv.org") &&
      parsed.pathname.startsWith(`/${kind}/`)
    ) {
      parsed.protocol = "https:";
      parsed.hostname = "arxiv.org";
      parsed.port = "";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // The caller will use the ID-derived canonical URL below.
  }

  return "";
}

function getVersionedId(value: unknown): string {
  const raw = cleanText(value);
  const match = raw.match(/\/abs\/([^?#/]+)$/);
  return match?.[1] ?? raw;
}

export function parseArxivFeed(xml: string): Paper[] {
  const document = parser.parse(xml) as AtomDocument;
  const entries = asArray(document.feed?.entry);

  return entries
    .map((entry): Paper | null => {
      const versionedId = getVersionedId(entry.id);
      const idMatch = versionedId.match(/^(.*?)(?:v(\d+))?$/);
      const id = idMatch?.[1] ?? "";
      const version = Number(idMatch?.[2] ?? 1);

      if (!id || !cleanText(entry.title) || !cleanText(entry.summary)) {
        return null;
      }

      const links = asArray(entry.link);
      const abstractLink = links.find(
        (link) => cleanText(link.rel) === "alternate",
      )?.href;
      const pdfLink = links.find(
        (link) =>
          cleanText(link.title) === "pdf" ||
          cleanText(link.type) === "application/pdf",
      )?.href;

      const categories = asArray(entry.category)
        .map((category) => cleanText(category.term))
        .filter(Boolean);
      const primaryCategory = cleanText(
        entry["arxiv:primary_category"]?.term,
      );

      return {
        id,
        versionedId,
        version,
        title: cleanText(entry.title),
        abstract: cleanText(entry.summary),
        authors: asArray(entry.author)
          .map((author) => cleanText(author.name))
          .filter(Boolean),
        publishedAt: cleanText(entry.published),
        updatedAt: cleanText(entry.updated),
        primaryCategory: primaryCategory || categories[0] || "unknown",
        categories,
        abstractUrl:
          normalizeArxivUrl(abstractLink, "abs") ||
          `https://arxiv.org/abs/${versionedId}`,
        pdfUrl:
          normalizeArxivUrl(pdfLink, "pdf") ||
          `https://arxiv.org/pdf/${versionedId}`,
        comment: cleanText(entry["arxiv:comment"]) || null,
        doi: cleanText(entry["arxiv:doi"]) || null,
        journalReference: cleanText(entry["arxiv:journal_ref"]) || null,
      };
    })
    .filter((paper): paper is Paper => paper !== null);
}

export function buildArxivQueryUrl(
  categories: readonly string[],
  maxResults = 150,
  start = 0,
): string {
  const safeCategories = categories.filter((category) =>
    /^[a-z-]+\.[A-Za-z-]+$/.test(category),
  );

  if (safeCategories.length === 0) {
    throw new Error("At least one valid arXiv category is required.");
  }

  const url = new URL("https://export.arxiv.org/api/query");
  url.searchParams.set(
    "search_query",
    `(${safeCategories.map((category) => `cat:${category}`).join(" OR ")})`,
  );
  url.searchParams.set("start", String(Math.max(0, Math.trunc(start))));
  url.searchParams.set(
    "max_results",
    String(Math.max(1, Math.min(2000, Math.trunc(maxResults)))),
  );
  url.searchParams.set("sortBy", "submittedDate");
  url.searchParams.set("sortOrder", "descending");

  return url.toString();
}
