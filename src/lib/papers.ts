import bundledData from "@/data/papers.json";
import { isBlobConfigured, readBlobSnapshot } from "@/lib/blob-snapshot";
import { loadPaperSnapshot, type PaperSnapshot } from "@/lib/paper-snapshot";

const bundledSnapshot = bundledData as PaperSnapshot;

export async function getPaperSnapshot(): Promise<PaperSnapshot> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";

  return loadPaperSnapshot({
    bundledSnapshot,
    readRemoteSnapshot: isBlobConfigured(process.env)
      ? () => readBlobSnapshot({ token })
      : undefined,
  });
}
