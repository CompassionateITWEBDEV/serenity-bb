"use client";

import { useEffect, useState } from "react";
import { urlFromChatPath } from "@/lib/chat/storage";

export type MessageMeta = {
  image_path?: string | null;
  audio_path?: string | null;
  // legacy:
  image_url?: string | null;
  audio_url?: string | null;
  duration_sec?: number | null;
};

export default function MessageMedia({ meta }: { meta?: MessageMeta | null }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;

    (async () => {
      // Resolve image
      const imgInput = meta?.image_path || meta?.image_url || null;
      if (imgInput) {
        const u = await urlFromChatPath(imgInput);
        if (!dead) setImgUrl(u);
      } else {
        setImgUrl(null);
      }

      // Resolve audio
      const audInput = meta?.audio_path || meta?.audio_url || null;
      if (audInput) {
        const u = await urlFromChatPath(audInput);
        if (!dead) setAudioUrl(u);
      } else {
        setAudioUrl(null);
      }
    })();

    return () => {
      dead = true;
    };
  }, [meta?.image_path, meta?.image_url, meta?.audio_path, meta?.audio_url]);

  return (
    <>
      {imgUrl && (
        <img
          src={imgUrl}
          alt="image"
          className="mb-2 max-h-64 w-full rounded-xl object-cover"
          onError={() => setImgUrl(null)} // why: hide broken media
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
