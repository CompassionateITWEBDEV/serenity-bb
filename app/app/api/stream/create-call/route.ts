import { NextResponse } from "next/server";
import { StreamClient } from "@stream-io/node-sdk";

export async function POST(req: Request) {
  try {
    const { callId, user, peerId } = await req.json();
    // user = { id: "user-id", name?: string, image?: string }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
    const secret = process.env.STREAM_SECRET!;
    if (!apiKey || !secret) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_STREAM_API_KEY or STREAM_SECRET" },
        { status: 500 }
      );
    }

    const server = new StreamClient({ apiKey, secret });

    // Create (or fetch) the call
    const call = server.video.call("default", callId);

    // Ensure both sides are members (this avoids 403 join errors)
    const members = [
      { user_id: user.id, role: "user" },
      ...(peerId ? [{ user_id: String(peerId), role: "user" }] : []),
    ];

    await call.getOrCreate({ members });

    // Token for the current user
    const token = server.createToken(String(user.id));

    return NextResponse.json({ apiKey, token, user, callId });
  } catch (e: any) {
    console.error("[create-call] error", e);
    return NextResponse.json(
      { error: e?.message || "Failed to create call" },
      { status: 500 }
    );
  }
}
