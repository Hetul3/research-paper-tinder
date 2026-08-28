# AGENTS.md

## Product goal

Build a free, mobile-first research-paper discovery app that replaces passive doomscrolling with a small daily queue of useful AI papers. A user sees one paper card at a time, can dismiss it, save it to read, expand its abstract, or open the paper, and then moves to the next card.

The experience may use a card-swipe interaction, but the product must have its own name and visual identity. Do not imply affiliation with or endorsement by arXiv or any dating app.

## MVP product decisions

- Start without accounts, paid APIs, ads, or an LLM dependency.
- Store dismissed, saved, and read paper IDs in browser storage. Design the storage layer so cloud sync can be added later.
- Offer buttons as well as gestures: dismiss, save/read later, open details, and undo the most recent swipe.
- Let users choose topic categories and default to a broad AI feed.
- Show title, authors, submitted/updated date, category labels, and a short abstract excerpt on each card.
- The short description must initially be an extractive excerpt from the author-provided abstract, not an AI-generated summary. Show the full abstract in details and label excerpts accurately.
- Saved papers must be browsable separately. Never lose a saved paper just because it is no longer in the current feed.
- Prevent already dismissed/read papers from immediately returning to the deck.
- Make the primary loop fast after initial load; a swipe must never trigger an arXiv request.
- Prioritize accessibility: keyboard controls, visible focus, reduced-motion support, screen-reader labels, and non-gesture alternatives are required.

## arXiv integration

Use the public legacy arXiv metadata API over HTTPS:

`https://export.arxiv.org/api/query`

It requires no API key and returns Atom 1.0 XML, not JSON. Query parameters include:

- `search_query`
- `id_list`
- `start` (zero-based offset)
- `max_results`
- `sortBy`: `relevance`, `lastUpdatedDate`, or `submittedDate`
- `sortOrder`: `ascending` or `descending`

Search fields include `ti` (title), `au` (author), `abs` (abstract), `co` (comment), `jr` (journal reference), `cat` (category), `rn` (report number), and `all`. Queries can use `AND`, `OR`, and `ANDNOT`. Always construct and encode query parameters with URL/URLSearchParams utilities rather than concatenating user text.

For a broad AI feed, begin with these categories and let the user narrow them:

- `cs.AI` — general artificial intelligence
- `cs.LG` — machine learning
- `cs.CL` — natural language processing
- `cs.CV` — computer vision
- `cs.RO` — robotics
- `cs.MA` — multi-agent systems
- `cs.NE` — neural and evolutionary computing
- `stat.ML` — statistically grounded machine learning

Do not use `cs.AI` alone: arXiv's taxonomy explicitly places vision, robotics, machine learning, multi-agent systems, and NLP in separate categories.

Normalize every Atom entry into an internal `Paper` model containing at least:

- base arXiv ID and returned versioned ID
- title
- abstract
- ordered author names
- published and updated timestamps
- primary category and all categories
- canonical abstract URL
- direct PDF URL
- optional DOI, journal reference, and author comment

Treat all upstream fields as untrusted text. Parse XML with a real XML/Atom parser, normalize whitespace, render text as text rather than HTML, and validate outbound links against expected `https://arxiv.org/` hosts.

## Mandatory upstream limits

The arXiv API terms currently require all legacy API clients, including the search API, RSS, and OAI-PMH, to:

- make no more than one request every three seconds across all machines under the project's control;
- use only one connection at a time;
- never distribute requests across clients or machines to evade these limits.

Do not lower the delay to one second. A higher request rate requires explicit agreement from arXiv support.

Centralize arXiv access in one server-side ingestion path. Never call arXiv directly per swipe or separately from every browser. Batch results, cache normalized metadata, deduplicate concurrent refreshes, and serve the deck from the cache. Cache the same discovery query for roughly a day unless a manual development refresh is needed; arXiv announces new metadata on a daily cycle.

Use a conservative initial batch (for example 100–200 results). The API permits slices of at most 2,000 results and at most 30,000 total results for a query, but recommends refining queries over 1,000 results. This product does not need bulk harvesting. If it later does, use OAI-PMH rather than paging the search API aggressively.

Retry only transient failures, honor `Retry-After` when present, use exponential backoff with jitter, and serve stale cached data when arXiv is unavailable. Never retry rapidly.

Browser requests to the search endpoint must not be assumed to support CORS. Keep XML fetching and parsing server-side or in a scheduled build/ingestion job.

## Reading and content rules

- Descriptive metadata—including titles, abstracts, authors, identifiers, and classifications—is CC0 and may be stored, transformed, and displayed.
- Paper PDFs and source files have per-paper copyrights and licenses. Do not download, cache, redistribute, or proxy them from this app by default.
- Link users to the canonical arXiv abstract page or load the direct arXiv PDF URL in a browser/PDF viewer. Always provide an "Open on arXiv" fallback.
- Do not iframe the arXiv abstract page; it currently disallows third-party framing.
- A direct PDF embed may work in some browsers, but it is progressive enhancement only. Mobile and browser failures must fall back to opening the arXiv URL.
- Do not scrape arXiv HTML pages. Use the metadata API, RSS, or OAI-PMH as appropriate.
- Display this requested acknowledgment in the app footer/about view: "Thank you to arXiv for use of its open access interoperability."
- Do not use arXiv's name, logo, web address, or colors as the product's brand, and do not claim arXiv endorsement.

## Free-first architecture

The MVP must be runnable locally and deployable without a required paid service.

Preferred baseline:

1. A static/mobile web client or PWA.
2. A scheduled server-side job or build step that fetches one batched arXiv query, normalizes it to cached JSON, and publishes it with the app.
3. Browser storage for anonymous preferences and swipe history.
4. Direct outbound arXiv links for papers and PDFs.

Keep hosting-provider code behind small adapters. Free tiers and their quotas change, so do not make correctness depend on a provider-specific free allowance. The app should continue to work from a previously generated JSON snapshot if the scheduled refresh or upstream API fails.

Features that may add ongoing cost or operational complexity and therefore are not part of the free MVP:

- account login and cross-device sync;
- push notifications or email digests;
- server-side collaborative lists;
- LLM-generated summaries, embeddings, or chat-with-paper;
- citation graphs, citation counts, or recommendations based on citation data;
- full-text search over PDF contents;
- analytics that require a paid event pipeline.

These can be added only with an explicit free implementation or after discussing cost, privacy, and data-source terms.

## Recommendation strategy

The arXiv API is a search/metadata feed, not a personalized recommendation API. For the MVP, rank locally and transparently using recency, chosen categories, keyword matches, and lightweight preference signals learned from saved/dismissed cards. Preserve some exploration so the feed does not become too narrow.

Do not claim that a swipe means a paper is scientifically good or bad. arXiv papers are preprints and may not be peer reviewed. Use language such as "save" and "skip," not quality ratings.

## Engineering expectations

- Keep data ingestion, normalization, ranking, persistence, and presentation as separate modules.
- Use one canonical base arXiv ID for deduplication and user history while retaining version metadata.
- Include fixture Atom feeds so parsing tests never depend on live arXiv.
- Test empty feeds, malformed XML, missing optional fields, duplicate/cross-listed papers, upstream errors, stale-cache behavior, storage migration, undo, and keyboard controls.
- Mock arXiv in routine tests. Live integration tests must be opt-in and must obey the three-second/single-connection rule.
- Never commit secrets. None are needed for the arXiv metadata API.
- Keep dependencies modest and prefer platform capabilities when they are adequate.
- Update this file and the user-facing About/Attribution copy if upstream terms or architecture materially change.

## Research references

Checked on 2026-08-27:

- API access and required acknowledgment: https://info.arxiv.org/help/api/index.html
- API terms, rate limits, metadata rights, and content restrictions: https://info.arxiv.org/help/api/tou.html
- Query syntax, paging, sort options, and Atom response fields: https://info.arxiv.org/help/api/user-manual.html
- Current category taxonomy: https://arxiv.org/category_taxonomy
- RSS update schedule and category feeds: https://info.arxiv.org/help/rss.html
- OAI-PMH bulk/incremental metadata interface: https://info.arxiv.org/help/oa/index.html
- Article license information: https://info.arxiv.org/help/license/index.html

