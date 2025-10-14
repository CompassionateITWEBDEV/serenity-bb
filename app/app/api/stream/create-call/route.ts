import { NextResponse } from "next/server";
// ✅ use the new server SDK package
import { StreamVideoServerClient } from "@stream-io/node-sdk";

export async function POST(req: Request) {
  try {
    const { callId, createdBy } = await req.json();

    if (!callId || !createdBy) {
      return NextResponse.json({ error: "Missing callId or createdBy" }, { status: 400 });
    }

    const apiKey = process.env.STREAM_API_KEY!;
    const apiSecret = process.env.STREAM_API_SECRET!;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "Missing STREAM_API_KEY/STREAM_API_SECRET" }, { status: 500 });
    }

    // ✅ new server client
    const serverClient = new StreamVideoServerClient({ apiKey, apiSecret });

    // create or fetch the call
    const call = serverClient.call("default", callId);
    await call.getOrCreate({
      created_by_id: createdBy,
      // optional: set custom settings here
      // settings_override: { recording: { mode: "available" } }
    });

    // generate a user token for the caller to join from the browser
    const token = serverClient.createToken(createdBy);

    return NextResponse.json({ apiKey, callId, token });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Failed to create call" }, { status: 500 });
  }
}
