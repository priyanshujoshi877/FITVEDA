const API_TOKEN = process.env.BRIGHTDATA_API_TOKEN;
const BASE = "https://api.brightdata.com/datasets/deep_lookup/v1";

function headers() {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

interface PreviewResponse {
  preview_id: string;
}

interface PreviewData {
  preview_id: string;
  query: string;
  status: "pending" | "processing" | "completed" | "failed";
  sample_data?: Record<string, unknown>[];
  columns?: Record<string, unknown>[];
}

/** Create a deep lookup preview and poll until completed. Returns the structured data as a string. */
export async function deepLookup(query: string): Promise<string> {
  // Step 1: Create preview
  const createRes = await fetch(`${BASE}/preview`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify([{ query }]),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`BrightData preview create failed (${createRes.status}): ${text}`);
  }

  const { preview_id } = (await createRes.json()) as PreviewResponse;

  // Step 2: Poll for results
  const maxWaitMs = 120_000;
  const interval = 3_000;
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const pollRes = await fetch(`${BASE}/preview/${preview_id}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    if (!pollRes.ok) {
      const text = await pollRes.text();
      throw new Error(`BrightData poll failed (${pollRes.status}): ${text}`);
    }

    const data = (await pollRes.json()) as PreviewData;

    if (data.status === "completed") {
      return JSON.stringify(data.sample_data ?? data.columns ?? data, null, 2);
    }

    if (data.status === "failed") {
      throw new Error("BrightData deep lookup failed");
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error("BrightData deep lookup timed out");
}
