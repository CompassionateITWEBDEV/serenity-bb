"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CHAT_BUCKET } from "@/lib/chat/storage";

export type MessageMeta = {
  image_path?: string | null;   // STORAGE path (preferred)
  audio_path?: string | null;   // STORAGE path (preferred)
  duration_sec?: number | null;
  // (extend with file_path later if you add generic files)
};

function isHttp(u?: string | null) {
  return !!u && /^https?:\/\//i.test(u);
}

async function toUrlFromPath(path: string): Promise<string | null> {
  try {
    const { data } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(path, 60 * 60 * 24);
    if (data?.signedUrl) return data.signedUrl;
  } catch {}
  try {
    const pub = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path);
    return pub?.data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

export default function MessageMedia(props: {
  meta?: MessageMeta | null;
  attachment_type?: "image" | "audio" | "file" | null;   // legacy
  attachment_url?: string | null;                        // legacy (path or full URL)
}) {
  const { meta, attachment_type, attachment_url } = props;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) New schema via meta.*_path
      if (meta?.image_path) {
        const u = await toUrlFromPath(meta.image_path);
        if (!cancelled) setImageUrl(u);
        return;
      }
      if (meta?.audio_path) {
        const u = await toUrlFromPath(meta.audio_path);
        if (!cancelled) setAudioUrl(u);
        return;
      }

      // 2) Legacy schema via attachment_*
      if (attachment_url) {
        if (attachment_type === "image") {
          if (isHttp(attachment_url)) setImageUrl(attachment_url);
          else setImageUrl(await toUrlFromPath(attachment_url));
          return;
        }
        if (attachment_type === "audio") {
          if (isHttp(attachment_url)) setAudioUrl(attachment_url);
          else setAudioUrl(await toUrlFromPath(attachment_url));
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [meta?.image_path, meta?.audio_path, attachment_type, attachment_url]);

  if (!imageUrl && !audioUrl) return null;

  return (
    <>
      {imageUrl && (
        <img
          src={imageUrl}
          alt="image"
          className="mb-2 max-h-64 w-full rounded-xl object-cover"
          onError={() => setImageUrl(null)}
        />
      )}
      {audioUrl && (
        <audio
          className="mb-2 w-full"
          controls
          src={audioUrl}
          onError={() => setAudioUrl(null)}
        />
      )}
    </>
  );
}
