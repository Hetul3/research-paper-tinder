import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AI_CATEGORIES,
  buildArxivQueryUrl,
  parseArxivFeed,
  type Paper,
} from "../src/lib/arxiv.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(projectRoot, "src/data/papers.json");

const response = await fetch(buildArxivQueryUrl(AI_CATEGORIES, 50), {
  headers: {
    Accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
  },
  signal: AbortSignal.timeout(55_000),
});

if (!response.ok) {
  throw new Error(`arXiv returned ${response.status}.`);
}

const byId = new Map<string, Paper>();
for (const paper of parseArxivFeed(await response.text())) {
  const existing = byId.get(paper.id);
  if (!existing || paper.version > existing.version) byId.set(paper.id, paper);
}

if (byId.size === 0) {
  throw new Error("arXiv returned no usable papers; keeping the existing bundle.");
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  papers: [...byId.values()],
};

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(snapshot, null, 2)}\n`);

process.stdout.write(`Wrote ${snapshot.papers.length} papers to ${destination}\n`);
