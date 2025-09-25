import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUser } from "@/app/api/_utils/auth";

function makePath(userId: string, fileName: string) {
  const safe = fileName.replace(/[^\w.-]+/g, "_");
  const ext = safe.includes(".") ? safe.split(".").pop() : "jpg";
  return `${userId}/${Date.now()}.${ext}`;
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { fileName, contentType } = await req.json().catch(() => ({}));
  if (!fileName || !contentType)
    return NextResponse.json({ error: "fileName and contentType required" }, { status: 400 });

  const path = makePath(user.id, fileName);
  const { data, error } = await supabaseAdmin()
    .storage.from("avatars")
    .createSignedUploadUrl(path, 60);

  if (error || !data?.signedUrl)
    return NextResponse.json({ error: error?.message ?? "Failed to create signed URL" }, { status: 500 });

  return NextResponse.json({ signedUrl: data.signedUrl, path });
}
