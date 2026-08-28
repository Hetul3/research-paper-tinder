import { describe, expect, it, vi } from "vitest";

import type { Paper } from "@/lib/arxiv";
import {
  loadPaperSnapshot,
  type PaperSnapshot,
} from "@/lib/paper-snapshot";

const paper: Paper = {
  id: "2608.00001",
  versionedId: "2608.00001v1",
  version: 1,
  title: "A Small Test Paper",
  abstract: "A useful abstract for a useful test.",
  authors: ["Ada Reader"],
  publishedAt: "2026-08-20T00:00:00Z",
  updatedAt: "2026-08-20T00:00:00Z",
  primaryCategory: "cs.AI",
  categories: ["cs.AI"],
  abstractUrl: "https://arxiv.org/abs/2608.00001v1",
  pdfUrl: "https://arxiv.org/pdf/2608.00001v1",
  comment: null,
  doi: null,
  journalReference: null,
};

const bundledSnapshot: PaperSnapshot = {
  generatedAt: "2026-08-20T00:00:00.000Z",
  papers: [paper],
};

describe("paper snapshots", () => {
  it("prefers a valid remotely refreshed snapshot", async () => {
    const remoteSnapshot: PaperSnapshot = {
      generatedAt: "2026-08-27T00:00:00.000Z",
      papers: [{ ...paper, id: "2608.00002", versionedId: "2608.00002v1" }],
    };
    const readRemoteSnapshot = vi.fn().mockResolvedValue(remoteSnapshot);

    await expect(
      loadPaperSnapshot({ bundledSnapshot, readRemoteSnapshot }),
    ).resolves.toEqual(remoteSnapshot);
    expect(readRemoteSnapshot).toHaveBeenCalledOnce();
  });

  it("serves the bundled snapshot when remote storage is not configured", async () => {
    await expect(loadPaperSnapshot({ bundledSnapshot })).resolves.toEqual(
      bundledSnapshot,
    );
  });

  it("serves stale bundled data when remote storage fails", async () => {
    const readRemoteSnapshot = vi
      .fn()
      .mockRejectedValue(new Error("Blob is temporarily unavailable"));

    await expect(
      loadPaperSnapshot({ bundledSnapshot, readRemoteSnapshot }),
    ).resolves.toEqual(bundledSnapshot);
  });

  it("rejects malformed remote data and keeps the known-good bundle", async () => {
    const readRemoteSnapshot = vi.fn().mockResolvedValue({
      generatedAt: "not a date",
      papers: [],
    });

    await expect(
      loadPaperSnapshot({ bundledSnapshot, readRemoteSnapshot }),
    ).resolves.toEqual(bundledSnapshot);
  });
});
