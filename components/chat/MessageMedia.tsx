"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const CHAT_BUCKET = (process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET ?? "chat").trim();
const isHttp = (u?: string|null) => !!u && /^https?:\/\//i.test(u);

async function toUrl(pathOrUrl?: string|null): Promise<string|null> {
  if (!pathOrUrl) return null;
  if (isHttp(pathOrUrl)) return pathOrUrl; // legacy direct URL
  try {
    const { data, error } = await supabase
      .storage.from(CHAT_BUCKET)
      .createSignedUrl(pathOrUrl, 60 * 60);
    if (error) {
      console.warn("[media] sign failed", { bucket: CHAT_BUCKET, pathOrUrl, error });
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (e) {
    console.warn("[media] sign threw", e);
    try {
      const pub = supabase.storage.from(CHAT_BUCKET).getPublicUrl(pathOrUrl);
      return pub?.data?.publicUrl ?? null;
    } catch {
      return null;
    }
  }
}

export function MessageMedia({
  // Supports either schema:
  // a) attachment_* on the row
  attachment_type,
  attachment_url,
  // b) or meta object (new schema)
  meta,
}: {
  attachment_type?: "image" | "audio" | "file" | null;
  attachment_url?: string | null;       // path or legacy URL
  meta?: { image_path?: string|null; audio_path?: string|null; image_url?: string|null; audio_url?: string|null } | null;
}) {
  const [img, setImg] = useState<string|null>(null);
  const [aud, setAud] = useState<string|null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      // decide source
      const imgSrc = meta?.image_path ?? meta?.image_url ?? (attachment_type === "image" ? attachment_url ?? null : null);
      const audSrc = meta?.audio_path ?? meta?.audio_url ?? (attachment_type === "audio" ? attachment_url ?? null : null);

      const [uImg, uAud] = await Promise.all([toUrl(imgSrc ?? null), toUrl(audSrc ?? null)]);
      if (!dead) { setImg(uImg); setAud(uAud); }
    })();
    return () => { dead = true; };
  }, [attachment_type, attachment_url, meta?.image_path, meta?.image_url, meta?.audio_path, meta?.audio_url]);

  return (
    <>
      {img && <img src={img} alt="" className="mb-2 max-h-64 w-full rounded-xl object-cover" onError={() => setImg(null)} />}
      {aud && <audio className="mb-2 w-full" controls src={aud} onError={() => setAud(null)} />}
    </>
  );
}
