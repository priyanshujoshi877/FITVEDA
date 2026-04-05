import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

/**
 * POST /api/zoom-signature
 *
 * Generates a JWT signature needed to join a Zoom meeting via the Meeting SDK.
 *
 * Request body:
 * {
 *   meetingNumber: string,
 *   role: number  // 0 = attendee, 1 = host
 * }
 *
 * Response:
 * { signature: string }
 *
 * Requires ZOOM_SDK_KEY and ZOOM_SDK_SECRET in .env.local
 */
export async function POST(req: NextRequest) {
  try {
    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;

    if (!sdkKey || !sdkSecret) {
      return NextResponse.json(
        { error: "ZOOM_SDK_KEY and ZOOM_SDK_SECRET must be set in .env.local" },
        { status: 500 }
      );
    }

    const { meetingNumber, role = 0 } = await req.json();

    if (!meetingNumber) {
      return NextResponse.json(
        { error: "meetingNumber is required" },
        { status: 400 }
      );
    }

    const iat = Math.round(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours

    const payload = {
      sdkKey,
      mn: String(meetingNumber).replace(/\s/g, ""),
      role: Number(role),
      iat,
      exp,
      tokenExp: exp,
    };

    const signature = jwt.sign(payload, sdkSecret, { algorithm: "HS256" });

    return NextResponse.json({ signature });
  } catch (err) {
    console.error("Zoom signature error:", err);
    return NextResponse.json(
      { error: "Failed to generate signature" },
      { status: 500 }
    );
  }
}
