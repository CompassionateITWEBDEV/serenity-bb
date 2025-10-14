import { NextRequest, NextResponse } from "next/server";
import { StreamVideoServerClient } from "@stream-io/video-node";

export async function POST(req: NextRequest) {
  try {
    const { callId, userId, userName } = await req.json();

    if (!callId || !userId) {
      return NextResponse.json({ error: "callId and userId are required" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "Stream keys not configured" }, { status: 500 });
    }

    const server = new StreamVideoServerClient({ apiKey, apiSecret });

    // Create call if missing; attach some metadata if you want
    await server.call("default", callId).getOrCreate({
      created_by_id: userId,
      // example: recording/livestream options could go here
    });

    // Mint user token (server-only)
    const token = server.createToken(userId, { name: userName });

    return NextResponse.json({ apiKey, token, callId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
