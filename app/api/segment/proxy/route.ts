import { NextRequest } from "next/server";

// Cache the fetched video in memory to support range requests
// without re-fetching from Replicate on every request.
const videoCache = new Map<string, { buffer: ArrayBuffer; contentType: string }>();

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return Response.json({ error: "No URL provided" }, { status: 400 });
  }

  try {
    let cached = videoCache.get(url);

    if (!cached) {
      const upstream = await fetch(url);
      if (!upstream.ok) {
        return Response.json(
          { error: `Upstream responded ${upstream.status}` },
          { status: 502 }
        );
      }

      const contentType = upstream.headers.get("content-type") || "video/mp4";
      const buffer = await upstream.arrayBuffer();
      cached = { buffer, contentType };
      videoCache.set(url, cached);
    }

    const { buffer, contentType } = cached;
    const totalSize = buffer.byteLength;

    // Handle range requests for video seeking
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
        const chunk = buffer.slice(start, end + 1);

        return new Response(chunk, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
            "Content-Length": String(chunk.byteLength),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(totalSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Proxy failed" },
      { status: 500 }
    );
  }
}
