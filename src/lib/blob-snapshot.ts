import type { PaperSnapshot } from "@/lib/paper-snapshot";

const SNAPSHOT_PATH = "feeds/latest.json";

type Environment = Record<string, string | undefined>;

interface ListOptions {
  limit: number;
  prefix: string;
  token: string;
}

interface ListResult {
  blobs: Array<{ url: string }>;
}

interface PutOptions {
  access: "public";
  addRandomSuffix: false;
  allowOverwrite: true;
  cacheControlMaxAge: number;
  contentType: "application/json";
  token: string;
}

type ListBlobs = (options: ListOptions) => Promise<ListResult>;
type PutBlob = (
  pathname: string,
  body: string,
  options: PutOptions,
) => Promise<unknown>;

interface ReadBlobSnapshotOptions {
  token: string;
  listBlobs?: ListBlobs;
  fetchBlob?: typeof fetch;
}

interface WriteBlobSnapshotOptions {
  token: string;
  putBlob?: PutBlob;
}

export function isBlobConfigured(environment: Environment = process.env): boolean {
  return Boolean(environment.BLOB_READ_WRITE_TOKEN?.trim());
}

function requireToken(token: string): string {
  if (!token.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for remote snapshots.");
  }

  return token;
}

async function defaultListBlobs(options: ListOptions): Promise<ListResult> {
  const { list } = await import("@vercel/blob");
  return list(options);
}

async function defaultPutBlob(
  pathname: string,
  body: string,
  options: PutOptions,
): Promise<unknown> {
  const { put } = await import("@vercel/blob");
  return put(pathname, body, options);
}

export async function readBlobSnapshot({
  token,
  listBlobs = defaultListBlobs,
  fetchBlob = fetch,
}: ReadBlobSnapshotOptions): Promise<unknown> {
  const validToken = requireToken(token);
  const result = await listBlobs({
    limit: 1,
    prefix: SNAPSHOT_PATH,
    token: validToken,
  });
  const blob = result.blobs[0];

  if (!blob) {
    throw new Error("No refreshed paper snapshot exists in Blob storage yet.");
  }

  const response = await fetchBlob(blob.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Blob snapshot returned ${response.status}.`);
  }

  return response.json();
}

export async function writeBlobSnapshot(
  snapshot: PaperSnapshot,
  { token, putBlob = defaultPutBlob }: WriteBlobSnapshotOptions,
): Promise<void> {
  const validToken = requireToken(token);
  await putBlob(SNAPSHOT_PATH, JSON.stringify(snapshot), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 300,
    contentType: "application/json",
    token: validToken,
  });
}
