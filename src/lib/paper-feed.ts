import {
  AI_CATEGORIES,
  buildArxivQueryUrl,
  parseArxivFeed,
  type Paper,
} from "@/lib/arxiv";
import type { PaperSnapshot } from "@/lib/paper-snapshot";

interface RefreshPaperSnapshotOptions {
  fetchArxiv?: typeof fetch;
  now?: () => Date;
  writeSnapshot: (snapshot: PaperSnapshot) => Promise<void>;
}

interface FetchPaperBatchOptions {
  start?: number;
  maxResults?: number;
  fetchArxiv?: typeof fetch;
}

function deduplicatePapers(papers: Paper[]): Paper[] {
  const byId = new Map<string, Paper>();

  for (const paper of papers) {
    const existing = byId.get(paper.id);
    if (!existing || paper.version > existing.version) {
      byId.set(paper.id, paper);
    }
  }

  return [...byId.values()];
}

export async function fetchPaperBatch({
  start = 0,
  maxResults = 150,
  fetchArxiv = fetch,
}: FetchPaperBatchOptions = {}): Promise<Paper[]> {
  const response = await fetchArxiv(
    buildArxivQueryUrl(AI_CATEGORIES, maxResults, start),
    {
      cache: "no-store",
      headers: {
        Accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
      },
    },
  );

  if (!response.ok) throw new Error(`arXiv returned ${response.status}.`);
  const papers = deduplicatePapers(parseArxivFeed(await response.text()));
  if (papers.length === 0) throw new Error("arXiv returned no usable papers.");
  return papers;
}

export async function refreshPaperSnapshot({
  fetchArxiv = fetch,
  now = () => new Date(),
  writeSnapshot,
}: RefreshPaperSnapshotOptions): Promise<PaperSnapshot> {
  const papers = await fetchPaperBatch({ fetchArxiv, maxResults: 150 });

  const snapshot: PaperSnapshot = {
    generatedAt: now().toISOString(),
    papers,
  };

  await writeSnapshot(snapshot);
  return snapshot;
}
