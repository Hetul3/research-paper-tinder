import { describe, expect, it, vi } from "vitest";

import { AI_CATEGORIES } from "@/lib/arxiv";
import { refreshPaperSnapshot } from "@/lib/paper-feed";

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>https://arxiv.org/abs/2608.12345v1</id>
    <updated>2026-08-26T14:30:00Z</updated>
    <published>2026-08-25T10:00:00Z</published>
    <title>Learning without doomscrolling</title>
    <summary>We introduce a calmer way to discover research.</summary>
    <author><name>Ada Reader</name></author>
    <link href="https://arxiv.org/abs/2608.12345v1" rel="alternate" />
    <link href="https://arxiv.org/pdf/2608.12345v1" type="application/pdf" title="pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
  <entry>
    <id>https://arxiv.org/abs/2608.12345v2</id>
    <updated>2026-08-27T14:30:00Z</updated>
    <published>2026-08-25T10:00:00Z</published>
    <title>Learning without doomscrolling, revised</title>
    <summary>We introduce a calmer and improved way to discover research.</summary>
    <author><name>Ada Reader</name></author>
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

describe("refreshPaperSnapshot", () => {
  it("fetches one broad batch, deduplicates it, and writes a snapshot", async () => {
    const fetchArxiv = vi.fn().mockResolvedValue(
      new Response(FEED, {
        status: 200,
        headers: { "content-type": "application/atom+xml" },
      }),
    );
    const writeSnapshot = vi.fn().mockResolvedValue(undefined);

    const snapshot = await refreshPaperSnapshot({
      fetchArxiv,
      now: () => new Date("2026-08-27T18:00:00.000Z"),
      writeSnapshot,
    });

    expect(fetchArxiv).toHaveBeenCalledOnce();
    const [requestUrl, requestOptions] = fetchArxiv.mock.calls[0];
    const url = new URL(requestUrl);
    expect(url.hostname).toBe("export.arxiv.org");
    expect(url.searchParams.get("max_results")).toBe("150");
    for (const category of AI_CATEGORIES) {
      expect(url.searchParams.get("search_query")).toContain(`cat:${category}`);
    }
    expect(requestOptions).toMatchObject({ cache: "no-store" });

    expect(snapshot.generatedAt).toBe("2026-08-27T18:00:00.000Z");
    expect(snapshot.papers).toHaveLength(1);
    expect(snapshot.papers[0].version).toBe(2);
    expect(writeSnapshot).toHaveBeenCalledOnce();
    expect(writeSnapshot).toHaveBeenCalledWith(snapshot);
  });

  it("does not replace the cache when arXiv returns an error", async () => {
    const writeSnapshot = vi.fn();

    await expect(
      refreshPaperSnapshot({
        fetchArxiv: vi.fn().mockResolvedValue(new Response("busy", { status: 503 })),
        writeSnapshot,
      }),
    ).rejects.toThrow("arXiv returned 503");
    expect(writeSnapshot).not.toHaveBeenCalled();
  });

  it("does not replace the cache with an empty or malformed feed", async () => {
    const writeSnapshot = vi.fn();

    await expect(
      refreshPaperSnapshot({
        fetchArxiv: vi.fn().mockResolvedValue(new Response("<feed />")),
        writeSnapshot,
      }),
    ).rejects.toThrow("no usable papers");
    expect(writeSnapshot).not.toHaveBeenCalled();
  });
});
