import { describe, expect, it } from "vitest";

import {
  AI_CATEGORIES,
  buildArxivQueryUrl,
  parseArxivFeed,
} from "@/lib/arxiv";

const FEED_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:arxiv="http://arxiv.org/schemas/atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <opensearch:totalResults>2</opensearch:totalResults>
  <entry>
    <id>https://arxiv.org/abs/2608.12345v2</id>
    <updated>2026-08-26T14:30:00Z</updated>
    <published>2026-08-25T10:00:00Z</published>
    <title>
      Learning useful things
      without doomscrolling
    </title>
    <summary>
      We introduce a calmer way to discover research.
      It learns from lightweight preference signals.
    </summary>
    <author><name>Ada Lovelace</name></author>
    <author><name>Alan Turing</name></author>
    <link href="https://arxiv.org/abs/2608.12345v2" rel="alternate" type="text/html" />
    <link href="https://arxiv.org/pdf/2608.12345v2" rel="related" type="application/pdf" title="pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
    <category term="cs.HC" />
    <arxiv:comment>12 pages, 4 figures</arxiv:comment>
    <arxiv:doi>10.1000/example</arxiv:doi>
  </entry>
  <entry>
    <id>https://arxiv.org/abs/2608.54321v1</id>
    <updated>2026-08-24T14:30:00Z</updated>
    <published>2026-08-24T14:30:00Z</published>
    <title>Small language models for everyone</title>
    <summary>Efficient models can make useful tools available locally.</summary>
    <author><name>Grace Hopper</name></author>
    <link href="http://arxiv.org/abs/2608.54321v1" rel="alternate" type="text/html" />
    <link href="http://arxiv.org/pdf/2608.54321v1" rel="related" type="application/pdf" title="pdf" />
    <arxiv:primary_category term="cs.CL" />
    <category term="cs.CL" />
  </entry>
</feed>`;

describe("parseArxivFeed", () => {
  it("normalizes Atom entries into safe paper records", () => {
    const papers = parseArxivFeed(FEED_FIXTURE);

    expect(papers).toHaveLength(2);
    expect(papers[0]).toEqual({
      id: "2608.12345",
      versionedId: "2608.12345v2",
      version: 2,
      title: "Learning useful things without doomscrolling",
      abstract:
        "We introduce a calmer way to discover research. It learns from lightweight preference signals.",
      authors: ["Ada Lovelace", "Alan Turing"],
      publishedAt: "2026-08-25T10:00:00Z",
      updatedAt: "2026-08-26T14:30:00Z",
      primaryCategory: "cs.AI",
      categories: ["cs.AI", "cs.HC"],
      abstractUrl: "https://arxiv.org/abs/2608.12345v2",
      pdfUrl: "https://arxiv.org/pdf/2608.12345v2",
      comment: "12 pages, 4 figures",
      doi: "10.1000/example",
      journalReference: null,
    });
  });

  it("upgrades expected arXiv links to HTTPS", () => {
    const [, paper] = parseArxivFeed(FEED_FIXTURE);

    expect(paper.abstractUrl).toBe("https://arxiv.org/abs/2608.54321v1");
    expect(paper.pdfUrl).toBe("https://arxiv.org/pdf/2608.54321v1");
  });
});

describe("buildArxivQueryUrl", () => {
  it("requests a broad AI feed in one newest-first batch", () => {
    const url = new URL(buildArxivQueryUrl(AI_CATEGORIES, 150));

    expect(url.origin + url.pathname).toBe(
      "https://export.arxiv.org/api/query",
    );
    expect(url.searchParams.get("max_results")).toBe("150");
    expect(url.searchParams.get("sortBy")).toBe("submittedDate");
    expect(url.searchParams.get("sortOrder")).toBe("descending");

    const query = url.searchParams.get("search_query") ?? "";
    for (const category of AI_CATEGORIES) {
      expect(query).toContain(`cat:${category}`);
    }
  });

  it("supports pagination for a later batch", () => {
    const url = new URL(buildArxivQueryUrl(AI_CATEGORIES, 150, 150));
    expect(url.searchParams.get("start")).toBe("150");
  });
});
