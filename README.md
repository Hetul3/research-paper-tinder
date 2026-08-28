# margin

A quiet, mobile-first way to discover AI research. Read one author abstract at a time, save what sparks your curiosity, skip what does not, and reach a real end to today's batch instead of an infinite recycled feed.

The MVP is intentionally free and accountless:

- no arXiv API key;
- no LLM or paid summarization API;
- no database for reader data;
- decisions, topic choices, and durable saved-paper metadata stay in the browser;
- a checked-in starter snapshot makes the app work with no environment variables;
- optional Vercel Blob storage and one daily cron keep deployed metadata fresh.

## Run locally

Use Node 22 (the version is recorded in `.nvmrc`), then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No account, API key, or `.env` file is required.

Useful checks:

```bash
npm test
npm run lint
npm run build
```

The production build uses Next.js with its supported webpack builder so it also works in port-restricted development sandboxes.

## Refresh the bundled starter deck

```bash
npm run refresh:bundle
```

That command makes one request for 50 results and replaces `src/data/papers.json` only after a non-empty arXiv response is parsed successfully. Do not run multiple copies concurrently. arXiv requires no more than one legacy API request every three seconds across all machines controlled by this project.

The checked-in bundle is a small known-good starter reading list, not a claim that those papers are today's newest. A configured deployment replaces it with the newest daily batch.

## Free Vercel deployment

Vercel Hobby is a good fit for a personal, noncommercial version of margin. Import this Git repository into Vercel, then:

1. In the project, create and connect a public Vercel Blob store. Vercel injects `BLOB_READ_WRITE_TOKEN` into the project.
2. Generate a long random value locally, for example with `openssl rand -hex 32`, and add it as the project's `CRON_SECRET`.
3. Redeploy so both variables are available to the function.

`vercel.json` schedules `GET /api/cron/refresh-papers` once each day. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically. The route fails closed if either variable is absent, fetches one 150-paper batch from arXiv, normalizes and validates it, and atomically overwrites `feeds/latest.json` in Blob. The page serves the bundled snapshot whenever Blob is missing, malformed, or unavailable.

Environment variable names are documented in `.env.example`; there are no values to copy from this repository.

Vercel's free-tier rules and quotas can change. Hobby is for personal, noncommercial use; a commercial launch may require a paid Vercel plan or another host. The application itself does not rely on a provider-specific service for correctness.

## Data flow

```text
daily Vercel cron -> one arXiv Atom request -> normalize/validate -> public Blob JSON
                                                               -> page snapshot
checked-in JSON ----------------------------------------------------^

paper card -> localStorage decisions, topics, saved metadata
paper/PDF links -> arXiv (never proxied or cached by margin)
```

arXiv's search API is metadata discovery, not a recommendation API. margin ranks locally using recency, selected categories, and categories from saved papers. It never requests arXiv during a swipe.

## Current scope and restrictions

- The interface supports touch drag, Save/Skip buttons, left/right keyboard controls, undo, topic filters, abstract expansion, canonical arXiv/PDF links, and a durable saved shelf.
- Author abstracts are shown directly; there are no AI-generated summaries.
- Saved state is browser-local, so it does not sync between devices and clearing site data removes it.
- No accounts, notifications, citation graph, PDF full-text search, collaborative lists, or chat-with-paper are included in the free MVP.
- PDFs have per-paper licenses. margin links to them but does not download, proxy, cache, or redistribute them.
- arXiv abstract pages cannot be embedded. Direct PDF embedding is unreliable across browsers, so this version opens canonical links instead.
- arXiv papers are preprints and may not be peer reviewed. Save/Skip records personal reading intent, not paper quality.

See [AGENTS.md](./AGENTS.md) for the researched API rules, architecture decisions, and primary arXiv references.

Thank you to arXiv for use of its open access interoperability.
