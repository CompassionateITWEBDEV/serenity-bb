"use client";

import { useEffect, useState } from "react";
import { urlFromChatPath } from "@/lib/chat/storage";

export type MessageMeta = {
  image_path?: string | null; // preferred: storage path
  audio_path?: string | null; // preferred: storage path
  image_url?: string | null;  // legacy: direct/public url
  audio_url?: string | null;  // legacy: direct/public url
  duration_sec?: number | null;
} | null;

type Props = {
  attachment_type?: "image" | "audio" | "file" | null; // legacy fields (optional)
  attachment_url?: string | null;                      // legacy path/url (optional)
  meta?: MessageMeta;                                  // new schema (preferred)
  className?: string;
};

export default function MessageMedia({
  attachment_type,
  attachment_url,
  meta,
  className,
}: Props) {
  const [img, setImg] = useState<string | null>(null);
  const [aud, setAud] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      const imgSrc =
        meta?.image_path ??
        meta?.image_url ??
        (attachment_type === "image" ? attachment_url ?? null : null);

      const audSrc =
        meta?.audio_path ??
        meta?.audio_url ??
        (attachment_type === "audio" ? attachment_url ?? null : null);

      const [uImg, uAud] = await Promise.all([
        imgSrc ? urlFromChatPath(imgSrc) : Promise.resolve(null),
        audSrc ? urlFromChatPath(audSrc) : Promise.resolve(null),
      ]);

      if (!dead) {
        setImg(uImg);
        setAud(uAud);
      }
    })();
    return () => {
      dead = true;
    };
  }, [attachment_type, attachment_url, meta?.image_path, meta?.image_url, meta?.audio_path, meta?.audio_url]);

  return (
    <div className={className}>
      {img && (
        <img
          src={img}
          alt=""
          className="mb-2 max-h-64 w-full rounded-xl object-cover"
          onError={() => setImg(null)} // why: hide broken image instead of showing broken icon
        />
      )}
      {aud && (
        <audio
          className="mb-2 w-full"
          controls
          src={aud}
          onError={() => setAud(null)}
        />
      )}
    </div>
  );
}
