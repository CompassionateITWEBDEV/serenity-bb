import { supabase } from "@/lib/supabase/client";

export const CHAT_BUCKET =
  (process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET ?? "chat").trim();

/** Upload a Blob/File and return the STORAGE PATH (never a URL). */
export async function chatUploadToPath(
  file: File | Blob,
  opts: { conversationId: string; kind: "image" | "audio"; fileName?: string }
): Promise<string> {
  const mime = (file as File).type || "application/octet-stream";
  const extFromName =
    (opts.fileName || (file as any).name || "").split(".").pop() || "";
  const ext =
    extFromName ||
    (mime.startsWith("image/") ? mime.split("/")[1] : mime ? "webm" : "bin");

  const key = `${opts.conversationId}/${Date.now()}-${crypto
    .randomUUID()
    .slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(key, file, {
      contentType: mime,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    if (/not found/i.test(error.message)) {
      throw new Error(`Bucket "${CHAT_BUCKET}" not found or inaccessible.`);
    }
    throw error;
  }
  return key; // <- STORAGE PATH
}

/** Resolve a STORAGE PATH (or legacy http URL) into a browser-usable URL. */
export async function urlFromChatPath(pathOrUrl: string): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // legacy kept working
  try {
    const { data } = await supabase
      .storage
      .from(CHAT_BUCKET)
      .createSignedUrl(pathOrUrl, 60 * 60); // 1 hour
    if (data?.signedUrl) return data.signedUrl;
  } catch {}
  try {
    // bucket public fallback
    const pub = supabase.storage.from(CHAT_BUCKET).getPublicUrl(pathOrUrl);
    return pub?.data?.publicUrl ?? null;
  } catch {
    return null;
  }
}
