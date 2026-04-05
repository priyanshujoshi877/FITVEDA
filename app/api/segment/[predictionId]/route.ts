import { NextRequest } from "next/server";
import Replicate from "replicate";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ predictionId: string }> }
) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return Response.json(
      { error: "REPLICATE_API_TOKEN not configured" },
      { status: 503 }
    );
  }

  const { predictionId } = await params;

  try {
    const replicate = new Replicate({ auth: token });
    const prediction = await replicate.predictions.get(predictionId);
    console.log(`[segment] Poll ${predictionId}: status=${prediction.status}, output=${JSON.stringify(prediction.output)?.slice(0, 200)}`);
    return Response.json(prediction);
  } catch (err) {
    console.error("Prediction poll error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch prediction" },
      { status: 500 }
    );
  }
}
