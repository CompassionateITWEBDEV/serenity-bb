import { NextResponse } from "next/server";
// If your alias isn't configured, change to: "../../../../../lib/supabase/admin"
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket")?.trim() ?? "";
    const path = searchParams.get("path")?.trim() ?? "";

    if (!bucket || !path) {
      return NextResponse.json({ error: "Missing bucket or path" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Blob to ArrayBuffer
    const contentType: string = (data as any).type || "application/octet-stream";
    const buf = await data.arrayBuffer();

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "Content-Length": String(buf.byteLength),
      },
    });
  } catch (err) {
    console.error("GET /api/chat/file error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
