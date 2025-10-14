import { NextResponse } from "next/server";
import { StreamClient } from "@stream-io/node-sdk"; // ✅ correct export for v0.7.11

export async function POST(req: Request) {
  try {
    const { callId, createdBy } = await req.json();

    if (!callId || !createdBy) {
      return NextResponse.json(
        { error: "Missing callId or createdBy" },
        { status: 400 }
      );
    }

    const apiKey = process.env.STREAM_API_KEY!;
    const apiSecret = process.env.STREAM_API_SECRET!;
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Missing STREAM_API_KEY/STREAM_API_SECRET" },
        { status: 500 }
      );
    }

    // Create the multi-product Stream server client
    const server = new StreamClient({ apiKey, apiSecret });

    // Use the Video product surface
    const call = server.video.call("default", callId);

    // Create the call (or fetch if it exists)
    await call.getOrCreate({
      created_by_id: createdBy,
      // settings_override: { recording: { mode: "available" } }, // optional
    });

    // JWT for the user to join from the browser
    const token = server.createToken(createdBy);

    return NextResponse.json({ apiKey, callId, token });
  } catch (err: any) {
    console.error("[create-call] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to create call" },
      { status: 500 }
    );
  }
}
