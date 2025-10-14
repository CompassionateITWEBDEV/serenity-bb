// app/api/stream/create-call/route.ts
import { NextResponse } from "next/server";
import { StreamClient } from "@stream-io/node-sdk";

export async function POST(req: Request) {
  try {
    const { callId, userId } = await req.json();

    if (!callId || !userId) {
      return NextResponse.json({ error: "Missing callId or userId" }, { status: 400 });
    }

    const apiKey = process.env.STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Missing STREAM_API_KEY/STREAM_API_SECRET" },
        { status: 500 }
      );
    }

    const server = new StreamClient({ apiKey, apiSecret });

    // Create or fetch the call
    const call = server.video.call("default", callId);
    await call.getOrCreate({ created_by_id: userId });

    // IMPORTANT: token must be for the SAME userId you’ll use to connect client-side
    const token = server.createToken(userId);

    return NextResponse.json({ apiKey, callId, token });
  } catch (e: any) {
    console.error("[create-call] ", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
