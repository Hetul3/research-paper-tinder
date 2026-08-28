import { describe, expect, it, vi } from "vitest";

import type { PaperSnapshot } from "@/lib/paper-snapshot";
import {
  isBlobConfigured,
  readBlobSnapshot,
  writeBlobSnapshot,
} from "@/lib/blob-snapshot";

const snapshot: PaperSnapshot = {
  generatedAt: "2026-08-27T18:00:00.000Z",
  papers: [],
};

describe("Vercel Blob snapshot adapter", () => {
  it("is optional and only configured when a token is present", () => {
    expect(isBlobConfigured({})).toBe(false);
    expect(isBlobConfigured({ BLOB_READ_WRITE_TOKEN: "" })).toBe(false);
    expect(isBlobConfigured({ BLOB_READ_WRITE_TOKEN: "blob-token" })).toBe(true);
  });

  it("reads the fixed latest snapshot from public Blob storage", async () => {
    const listBlobs = vi.fn().mockResolvedValue({
      blobs: [{ url: "https://public.blob.vercel-storage.com/margin/latest.json" }],
    });
    const fetchBlob = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(snapshot), { status: 200 }));

    await expect(
      readBlobSnapshot({ token: "blob-token", listBlobs, fetchBlob }),
    ).resolves.toEqual(snapshot);
    expect(listBlobs).toHaveBeenCalledWith({
      limit: 1,
      prefix: "feeds/latest.json",
      token: "blob-token",
    });
    expect(fetchBlob).toHaveBeenCalledWith(
      "https://public.blob.vercel-storage.com/margin/latest.json",
      { cache: "no-store" },
    );
  });

  it("writes a stable cache object that a later refresh can overwrite", async () => {
    const putBlob = vi.fn().mockResolvedValue({});

    await writeBlobSnapshot(snapshot, { token: "blob-token", putBlob });

    expect(putBlob).toHaveBeenCalledWith(
      "feeds/latest.json",
      JSON.stringify(snapshot),
      {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 300,
        contentType: "application/json",
        token: "blob-token",
      },
    );
  });

  it("fails clearly instead of making an unauthenticated storage request", async () => {
    await expect(readBlobSnapshot({ token: "" })).rejects.toThrow(
      "BLOB_READ_WRITE_TOKEN",
    );
    await expect(writeBlobSnapshot(snapshot, { token: "" })).rejects.toThrow(
      "BLOB_READ_WRITE_TOKEN",
    );
  });
});
