import { describe, expect, it, vi } from "vitest";

import { fetchPaperBatch } from "@/lib/paper-feed";
import { GET } from "@/app/api/papers/route";

vi.mock("@/lib/paper-feed", () => ({ fetchPaperBatch: vi.fn() }));

describe("GET /api/papers", () => {
  it("rejects invalid offsets", async () => {
    const response = await GET(new Request("https://example.com/api/papers?start=-1"));
    expect(response.status).toBe(400);
  });

  it("returns a requested next batch", async () => {
    vi.mocked(fetchPaperBatch).mockResolvedValueOnce([
      {
        id: "2608.1", versionedId: "2608.1v1", version: 1,
        title: "Paper", abstract: "Abstract", authors: [],
        publishedAt: "2026-08-27T00:00:00Z", updatedAt: "2026-08-27T00:00:00Z",
        primaryCategory: "cs.AI", categories: ["cs.AI"],
        abstractUrl: "https://arxiv.org/abs/2608.1", pdfUrl: "https://arxiv.org/pdf/2608.1",
        comment: null, doi: null, journalReference: null,
      },
    ]);
    const response = await GET(new Request("https://example.com/api/papers?start=150"));
    expect(response.status).toBe(200);
    expect((await response.json()).nextStart).toBe(300);
    expect(fetchPaperBatch).toHaveBeenCalledWith({ start: 150, maxResults: 150 });
  });
});
