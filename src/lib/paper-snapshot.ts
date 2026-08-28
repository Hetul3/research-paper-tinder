import type { Paper } from "@/lib/arxiv";

export interface PaperSnapshot {
  generatedAt: string;
  papers: Paper[];
}

interface LoadPaperSnapshotOptions {
  bundledSnapshot: PaperSnapshot;
  readRemoteSnapshot?: () => Promise<unknown>;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isPaperRecord(value: unknown): value is Paper {
  if (!value || typeof value !== "object") return false;

  const paper = value as Partial<Paper>;
  return (
    typeof paper.id === "string" &&
    paper.id.length > 0 &&
    typeof paper.versionedId === "string" &&
    typeof paper.version === "number" &&
    typeof paper.title === "string" &&
    paper.title.length > 0 &&
    typeof paper.abstract === "string" &&
    paper.abstract.length > 0 &&
    isStringArray(paper.authors) &&
    typeof paper.publishedAt === "string" &&
    typeof paper.updatedAt === "string" &&
    typeof paper.primaryCategory === "string" &&
    isStringArray(paper.categories) &&
    typeof paper.abstractUrl === "string" &&
    paper.abstractUrl.startsWith("https://arxiv.org/abs/") &&
    typeof paper.pdfUrl === "string" &&
    paper.pdfUrl.startsWith("https://arxiv.org/pdf/")
  );
}

export function isPaperSnapshot(value: unknown): value is PaperSnapshot {
  if (!value || typeof value !== "object") return false;

  const snapshot = value as Partial<PaperSnapshot>;
  return (
    typeof snapshot.generatedAt === "string" &&
    !Number.isNaN(Date.parse(snapshot.generatedAt)) &&
    Array.isArray(snapshot.papers) &&
    snapshot.papers.length > 0 &&
    snapshot.papers.every(isPaperRecord)
  );
}

export async function loadPaperSnapshot({
  bundledSnapshot,
  readRemoteSnapshot,
}: LoadPaperSnapshotOptions): Promise<PaperSnapshot> {
  if (!readRemoteSnapshot) return bundledSnapshot;

  try {
    const remoteSnapshot = await readRemoteSnapshot();
    return isPaperSnapshot(remoteSnapshot) ? remoteSnapshot : bundledSnapshot;
  } catch {
    return bundledSnapshot;
  }
}
