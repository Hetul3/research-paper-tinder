import { afterEach, describe, expect, it, vi } from "vitest";

import { refreshPaperSnapshot } from "@/lib/paper-feed";

vi.mock("@/lib/paper-feed", () => ({
  refreshPaperSnapshot: vi.fn(),
}));

import { GET } from "@/app/api/cron/refresh-papers/route";

const refreshMock = vi.mocked(refreshPaperSnapshot);

function cronRequest(authorization?: string): Request {
  return new Request("https://margin.example/api/cron/refresh-papers", {
    headers: authorization ? { authorization } : undefined,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/refresh-papers", () => {
  it("fails closed when deployment secrets are not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");

    const response = await GET(cronRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Paper refresh is not configured.",
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("rejects requests without Vercel's bearer secret", async () => {
    vi.stubEnv("CRON_SECRET", "top-secret");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");

    const response = await GET(cronRequest("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("refreshes the shared snapshot for an authenticated daily request", async () => {
    vi.stubEnv("CRON_SECRET", "top-secret");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");
    refreshMock.mockResolvedValue({
      generatedAt: "2026-08-27T18:00:00.000Z",
      papers: [{ id: "paper-one" }],
    } as Awaited<ReturnType<typeof refreshPaperSnapshot>>);

    const response = await GET(cronRequest("Bearer top-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      generatedAt: "2026-08-27T18:00:00.000Z",
      refreshed: 1,
    });
    expect(refreshMock).toHaveBeenCalledOnce();
    expect(refreshMock).toHaveBeenCalledWith({
      writeSnapshot: expect.any(Function),
    });
  });

  it("reports an upstream failure without exposing internal details", async () => {
    vi.stubEnv("CRON_SECRET", "top-secret");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");
    refreshMock.mockRejectedValue(new Error("private upstream detail"));

    const response = await GET(cronRequest("Bearer top-secret"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "The paper feed could not be refreshed.",
    });
  });
});
