import { NextResponse } from "next/server";

const MODEL = "gemini-2.5-flash-lite";
const MAX_ABSTRACT_LENGTH = 40_000;
const DAILY_LIMIT_PER_IP = 10;
const cache = new Map<string, string>();
const usage = new Map<string, { day: string; count: number }>();

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

function prompt(abstract: string): string {
  return [
    "Summarize this research paper abstract for a curious technical reader.",
    "Use only claims explicitly supported by the abstract. Do not invent numbers, methods, or conclusions.",
    "In 3 short sections, state: (1) what the researchers were trying to learn, (2) what they did, and (3) what they found and whether the result supports the stated claim.",
    "If the abstract does not establish something, say that it is unclear.",
    `ABSTRACT:\n${abstract}`,
  ].join("\n\n");
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Summaries are not configured." }, { status: 503 });

  let body: { paperId?: unknown; abstract?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.paperId !== "string" || typeof body.abstract !== "string" || !body.paperId || !body.abstract || body.abstract.length > MAX_ABSTRACT_LENGTH) {
    return NextResponse.json({ error: "A paper ID and valid abstract are required." }, { status: 400 });
  }

  const cached = cache.get(body.paperId);
  if (cached) return NextResponse.json({ summary: cached, cached: true });

  const today = new Date().toISOString().slice(0, 10);
  const key = clientKey(request);
  const current = usage.get(key);
  if (current?.day === today && current.count >= DAILY_LIMIT_PER_IP) {
    return NextResponse.json({ error: "Daily summary limit reached. Try again tomorrow." }, { status: 429 });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt(body.abstract) }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 350 } }),
    },
  );
  if (!response.ok) return NextResponse.json({ error: "The summary service is temporarily unavailable." }, { status: 502 });
  const result = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const summary = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!summary) return NextResponse.json({ error: "The summary service returned no text." }, { status: 502 });
  cache.set(body.paperId, summary);
  usage.set(key, { day: today, count: (current?.day === today ? current.count : 0) + 1 });
  return NextResponse.json({ summary, cached: false });
}
