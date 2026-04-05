import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";

const VIDEO_DIR = path.join(os.tmpdir(), "fitveda");

export async function POST(request: NextRequest) {
  const { videoId, url } = (await request.json()) as {
    videoId: string;
    url: string;
  };

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return Response.json({ error: "Invalid video ID" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return Response.json({ error: "Missing URL" }, { status: 400 });
  }

  try {
    await mkdir(VIDEO_DIR, { recursive: true });

    const upstream = await fetch(url);
    if (!upstream.ok) {
      return Response.json(
        { error: `Failed to fetch segmented video: ${upstream.status}` },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const dest = path.join(VIDEO_DIR, `${videoId}_mask.mp4`);
    await writeFile(dest, buffer);

    console.log(`[segment/save] Saved ${videoId}_mask.mp4 (${buffer.length} bytes)`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[segment/save] Error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 }
    );
  }
}
