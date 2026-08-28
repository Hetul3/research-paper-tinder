import { fetchPaperBatch } from "@/lib/paper-feed";
import type { Paper } from "@/lib/arxiv";

const BATCH_SIZE = 150;
const CACHE_TTL_MS = 60 * 60 * 1000;
const MIN_ARXIV_INTERVAL_MS = 3000;
const cache = new Map<number, { expiresAt: number; papers: Paper[] }>();
const inFlight = new Map<number, Promise<Paper[]>>();
let lastRequestAt = 0;

function wait(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

async function getBatch(start: number): Promise<Paper[]> {
  const cached = cache.get(start);
  if (cached && cached.expiresAt > Date.now()) return cached.papers;
  const running = inFlight.get(start);
  if (running) return running;

  const request = (async () => {
    await wait(Math.max(0, MIN_ARXIV_INTERVAL_MS - (Date.now() - lastRequestAt)));
    lastRequestAt = Date.now();
    const papers = await fetchPaperBatch({ start, maxResults: BATCH_SIZE });
    cache.set(start, { expiresAt: Date.now() + CACHE_TTL_MS, papers });
    return papers;
  })();
  inFlight.set(start, request);
  try {
    return await request;
  } finally {
    inFlight.delete(start);
  }
}

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("start") ?? "0";
  const start = Number(value);
  if (!Number.isInteger(start) || start < 0 || start > 30000) {
    return Response.json({ error: "start must be an integer between 0 and 30000" }, { status: 400 });
  }

  try {
    const papers = await getBatch(start);
    return Response.json({ papers, start, nextStart: start + BATCH_SIZE });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to fetch papers." },
      { status: 502 },
    );
  }
}
