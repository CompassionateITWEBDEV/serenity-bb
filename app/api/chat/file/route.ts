import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bucket = (searchParams.get("bucket") || "").trim();
    const path = (searchParams.get("path") || "").trim();

    if (!bucket || !path) {
      return NextResponse.json({ error: "Missing bucket or path" }, { status: 400 });
    }

    // Download bytes from Supabase Storage
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
    if (error || !data) {
      // Avoid leaking internals
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Try to guess content-type from metadata (falls back to octet-stream)
    // @ts-expect-error: data has type Blob with optional 'type'
    const type: string = (data as any).type || "application/octet-stream";
    const arrBuf = await data.arrayBuffer();

    return new NextResponse(arrBuf, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "Content-Length": String(arrBuf.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
