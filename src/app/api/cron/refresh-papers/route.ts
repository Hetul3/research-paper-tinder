import { writeBlobSnapshot } from "@/lib/blob-snapshot";
import { refreshPaperSnapshot } from "@/lib/paper-feed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(body: object, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  if (!cronSecret || !blobToken) {
    return json({ error: "Paper refresh is not configured." }, 503);
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return json({ error: "Unauthorized." }, 401);
  }

  try {
    const snapshot = await refreshPaperSnapshot({
      writeSnapshot: (nextSnapshot) =>
        writeBlobSnapshot(nextSnapshot, { token: blobToken }),
    });

    return json(
      {
        generatedAt: snapshot.generatedAt,
        refreshed: snapshot.papers.length,
      },
      200,
    );
  } catch {
    return json({ error: "The paper feed could not be refreshed." }, 502);
  }
}
