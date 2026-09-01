import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/summarize/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request(body: unknown): Request {
  return new Request("https://margin.example/api/summarize", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "test-user" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/summarize", () => {
  it("fails clearly when the Gemini key is not configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await POST(request({ paperId: "p1", abstract: "An abstract." }));
    expect(response.status).toBe(503);
  });

  it("returns and caches a Gemini summary", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Finding: It works." }] } }] }), { status: 200 }),
    );
    const body = { paperId: "p1", abstract: "An abstract." };
    await expect(POST(request(body))).resolves.toHaveProperty("status", 200);
    const second = await POST(request(body));
    expect(second.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
