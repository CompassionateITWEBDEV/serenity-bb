import { NextResponse } from "next/server";
import supabaseServer, { supabaseAdmin } from "@/lib/supabase/server";

// Build canonical storage path avatars/{userId}/{timestamp}.{ext}
function makePath(userId: string, fileName: string) {
  const safe = fileName.replace(/[^\w.-]+/g, "_");
  const ext = safe.includes(".") ? safe.split(".").pop() : "jpg";
  return `${userId}/${Date.now()}.${ext}`;
}

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileName, contentType } = await req.json().catch(() => ({} as any));
  if (!fileName || !contentType) {
    return NextResponse.json({ error: "fileName and contentType required" }, { status: 400 });
  }

  const path = makePath(user.id, fileName);
  const admin = supabaseAdmin();

  // 60s to upload
  const { data, error } = await admin.storage
    .from("avatars")
    .createSignedUploadUrl(path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Failed to create signed URL" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path });
}
