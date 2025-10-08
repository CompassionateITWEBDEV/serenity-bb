// FILE: lib/chat/storage.ts
// Purpose: Storage helpers only (no JSX/React here).

import { supabase } from "@/lib/supabase/client";

export type AttachmentKind = "image" | "audio" | "file";

export const CHAT_BUCKET =
  (process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET ?? "chat").trim();

const isHttp = (u?: string | null) => !!u && /^https?:\/\//i.test(u);

function extFromMime(m: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
  };
  return map[m] ?? "bin";
}

/**
 * Upload a file/blob to Supabase Storage and return the STORAGE PATH.
 * Store this path in DB (not a signed URL).
 */
export async function chatUploadToPath(
  file: File | Blob,
  opts: {
    conversationId: string;
    kind: AttachmentKind;
    userId?: string;
    fileName?: string;
  }
): Promise<string> {
  if (!opts.conversationId) throw new Error("Missing conversationId");

  const mime = (file as File).type || "application/octet-stream";
  const nameExt =
    (opts.fileName?.split(".").pop()?.toLowerCase() as string | undefined) ||
    (file as File).name?.split(".").pop()?.toLowerCase() ||
    extFromMime(mime);

  const filename = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${nameExt}`;

  // Foldering: <conversation>/<kind>/<user-or-n>/<filename>
  const userSeg = opts.userId ?? "n";
  const path = `${opts.conversationId}/${opts.kind}/${userSeg}/${filename}`;

  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, {
    contentType: mime,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    if (/not found/i.test(error.message)) {
      throw new Error(`Bucket "${CHAT_BUCKET}" not found or not accessible.`);
    }
    throw error;
  }
  return path;
}

/**
 * Resolve a storage PATH (or legacy HTTP URL) to a usable URL.
 * Prefers a signed URL; falls back to public URL if bucket is public.
 */
export async function urlFromChatPath(
  pathOrUrl: string | null | undefined,
  ttlSeconds = 60 * 60
): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (isHttp(pathOrUrl)) return pathOrUrl;

  try {
    const { data, error } = await supabase
      .storage
      .from(CHAT_BUCKET)
      .createSignedUrl(pathOrUrl, ttlSeconds);
    if (error) {
      console.warn("[urlFromChatPath] sign failed", { pathOrUrl, error });
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (e) {
    console.warn("[urlFromChatPath] exception", e);
    try {
      const pub = supabase.storage.from(CHAT_BUCKET).getPublicUrl(pathOrUrl);
      return pub?.data?.publicUrl ?? null;
    } catch {
      return null;
    }
  }
}
