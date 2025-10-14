// app/api/stream/create-call/route.ts
import { NextResponse } from "next/server";
import { Video } from "@stream-io/node-sdk";

export async function POST(req: Request) {
  try {
    const { callId, userId, userName } = await req.json();

    if (!process.env.NEXT_PUBLIC_STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      return NextResponse.json({ error: "Missing Stream env vars" }, { status: 500 });
    }
    if (!callId || !userId) {
      return NextResponse.json({ error: "callId and userId are required" }, { status: 400 });
    }

    const video = new Video({
      apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      secret: process.env.STREAM_API_SECRET!,
    });

    // Create (or get) the call
    const call = video.call("default", String(callId));
    await call.getOrCreate({
      data: {
        created_by_id: userId,
        members: [{ user_id: userId, role: "admin" }],
        custom: { userName },
      },
    });

    // Return a user token for this userId
    const token = video.createToken(userId);
    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create call" }, { status: 500 });
  }
}
// app/api/stream/create-call/route.ts
import { NextResponse } from "next/server";
import { Video } from "@stream-io/node-sdk";

export async function POST(req: Request) {
  try {
    const { callId, userId, userName } = await req.json();

    if (!process.env.NEXT_PUBLIC_STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      return NextResponse.json({ error: "Missing Stream env vars" }, { status: 500 });
    }
    if (!callId || !userId) {
      return NextResponse.json({ error: "callId and userId are required" }, { status: 400 });
    }

    const video = new Video({
      apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      secret: process.env.STREAM_API_SECRET!,
    });

    // Create (or get) the call
    const call = video.call("default", String(callId));
    await call.getOrCreate({
      data: {
        created_by_id: userId,
        members: [{ user_id: userId, role: "admin" }],
        custom: { userName },
      },
    });

    // Return a user token for this userId
    const token = video.createToken(userId);
    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create call" }, { status: 500 });
  }
}
// app/api/stream/create-call/route.ts
import { NextResponse } from "next/server";
import { Video } from "@stream-io/node-sdk";

export async function POST(req: Request) {
  try {
    const { callId, userId, userName } = await req.json();

    if (!process.env.NEXT_PUBLIC_STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      return NextResponse.json({ error: "Missing Stream env vars" }, { status: 500 });
    }
    if (!callId || !userId) {
      return NextResponse.json({ error: "callId and userId are required" }, { status: 400 });
    }

    const video = new Video({
      apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      secret: process.env.STREAM_API_SECRET!,
    });

    // Create (or get) the call
    const call = video.call("default", String(callId));
    await call.getOrCreate({
      data: {
        created_by_id: userId,
        members: [{ user_id: userId, role: "admin" }],
        custom: { userName },
      },
    });

    // Return a user token for this userId
    const token = video.createToken(userId);
    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create call" }, { status: 500 });
  }
}
