"use client";

import { useEffect, useState, useMemo } from "react";
import { CheckCheck } from "lucide-react";
// If you moved the helper, use "@/lib/storage" instead.
import { urlForAttachment } from "@/lib/chat/storage";
import type { MessageRow } from "./types";

function looksLikeImage(u?: string | null) {
  return !!u && /\.(png|jpe?g|gif|webp|bmp|heic|svg)(\?|#|$)/i.test(u);
}
function looksLikeAudio(u?: string | null) {
  return !!u && /\.(mp3|m4a|aac|wav|ogg|webm)(\?|#|$)/i.test(u);
}

export default function MessageBubble({
  m,
  own,
  bubbleBase,
}: {
  m: MessageRow;
  own: boolean;
  bubbleBase: string;
}) {
  const bubble = own
    ? `bg-cyan-500 text-white ${bubbleBase} shadow-md`
    : `bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 ${bubbleBase} ring-1 ring-gray-200/70 dark:ring-zinc-700`;

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  // Infer kind when DB column is null/legacy.
  const inferredKind: "image" | "audio" | "file" | null = useMemo(() => {
    if (m.attachment_type) return m.attachment_type;
    if (looksLikeImage(m.attachment_url)) return "image";
    if (looksLikeAudio(m.attachment_url)) return "audio";
    return m.attachment_url ? "file" : null;
  }, [m.attachment_type, m.attachment_url]);

  useEffect(() => {
    let dead = false;
    (async () => {
      // Attachment path/URL present → resolve for any kind.
      if (m.attachment_url) {
        const u = await urlForAttachment(m.attachment_url);
        if (!dead) setMediaUrl(u);
        return;
      }
      // Fallback: image URL embedded in content.
      const url =
        m.content?.match(
          /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|heic|svg)(?:\?\S*)?/i
        )?.[0] ?? null;
      if (!dead) setMediaUrl(url);
    })();
    return () => {
      dead = true;
    };
  }, [m.id, m.attachment_url, m.content]);

  const showText = useMemo(() => {
    const t = (m.content || "").trim().toLowerCase();
    return !!t && t !== "(image)" && t !== "(photo)" && t !== "(voice note)";
  }, [m.content]);

  return (
    <div className={`flex items-end gap-2 ${own ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] sm:max-w-[70%] ${bubble}`}>
        {inferredKind === "image" && mediaUrl && (
          <img
            src={mediaUrl}
            alt="image"
            className="mb-2 max-h-64 w-full rounded-xl object-cover"
            onError={() => setMediaUrl(null)} // why: hide broken media
          />
        )}

        {inferredKind === "audio" && mediaUrl && (
          <audio
            className="mb-2 w-full"
            controls
            src={mediaUrl}
            onError={() => setMediaUrl(null)}
          />
        )}

        {inferredKind === "file" && mediaUrl && (
          <a className="mb-2 block underline" href={mediaUrl} target="_blank" rel="noreferrer">
            Download file
          </a>
        )}

        {showText && (
          <div className="whitespace-pre-wrap break-words">{m.content}</div>
        )}

        <div
          className={`mt-1 flex items-center gap-1 text-[10px] ${
            own ? "text-cyan-100/90" : "text-gray-500"
          }`}
        >
          {new Date(m.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {own && m.read && (
            <CheckCheck className="ml-0.5 inline h-3.5 w-3.5 opacity-90" />
          )}
        </div>
      </div>
    </div>
  );
}
