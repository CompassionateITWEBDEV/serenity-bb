// lib/chat/storage.ts
import { supabase } from "@/lib/supabase/client";
export const CHAT_BUCKET = (process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET ?? "chat").trim();

export async function urlFromChatPath(pathOrUrl: string): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // legacy

  try {
    const { data, error } = await supabase
      .storage
      .from(CHAT_BUCKET)
      .createSignedUrl(pathOrUrl, 60 * 60); // 1h
    if (error) {
      console.warn("[urlFromChatPath] sign failed", error.message, { pathOrUrl, CHAT_BUCKET });
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (e) {
    console.warn("[urlFromChatPath] exception", e);
    try {
      const pub = supabase.storage.from(CHAT_BUCKET).getPublicUrl(pathOrUrl);
      return pub?.data?.publicUrl ?? null; // fallback if bucket is public
    } catch {
      return null;
    }
  }
}
