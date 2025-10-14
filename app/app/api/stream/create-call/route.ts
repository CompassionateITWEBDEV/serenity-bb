// app/api/stream/create-call/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StreamClient } from "@stream-io/node-sdk";

export async function POST(req: NextRequest) {
  try {
    const { callId, userId, userName } = await req.json();

    if (!callId || !userId) {
      return NextResponse.json({ error: "Missing callId or userId" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
    const secret = process.env.STREAM_SECRET!;
    if (!apiKey || !secret) {
      return NextResponse.json({ error: "Missing Stream env vars" }, { status: 500 });
    }

    const server = new StreamClient(apiKey, secret, { timeout: 10000 });

    const call = server.video.call("default", String(callId));
    await call.getOrCreate({
      created_by_id: userId,
      ring: true,
      custom: { created_by_name: userName ?? "" },
    });

    const token = server.createToken(
      userId,
      Math.floor(Date.now() / 1000) + 60 * 60
    );

    return NextResponse.json({ token });
  } catch (e: any) {
    console.error("[create-call] error:", e);
    return NextResponse.json({ error: e?.message || "create-call failed" }, { status: 500 });
  }
}
