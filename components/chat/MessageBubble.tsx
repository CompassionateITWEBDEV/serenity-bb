"use client";
import { useEffect, useState } from "react";
import { CheckCheck } from "lucide-react";
import { urlForAttachment } from "@/lib/chat_upload";
import type { MessageRow } from "./types"; // or inline the type you already have

export default function MessageBubble({ m, own, bubbleBase }: {
  m: MessageRow; own: boolean; bubbleBase: string;
}) {
  const [imgUrl, setImgUrl] = useState<string|null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      if (m.attachment_type === "image" && m.attachment_url) {
        const u = await urlForAttachment(m.attachment_url);
        if (!dead) setImgUrl(u);
      } else {
        // fallback: try URL in content
        const url = m.content?.match(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|heic|svg)(?:\?\S*)?/i)?.[0] ?? null;
        if (!dead) setImgUrl(url);
      }
    })();
    return () => { dead = true; };
  }, [m.id, m.attachment_type, m.attachment_url, m.content]);

  const bubble = own
    ? `bg-cyan-500 text-white ${bubbleBase} shadow-md`
    : `bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 ${bubbleBase} ring-1 ring-gray-200/70 dark:ring-zinc-700`;

  const showText = (() => {
    const t = (m.content || "").trim().toLowerCase();
    return !!t && t !== "(image)" && t !== "(photo)";
  })();

  return (
    <div className={`flex items-end gap-2 ${own ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] sm:max-w-[70%] ${bubble}`}>
        {imgUrl && <img src={imgUrl} alt="attachment" className="mb-2 max-h-64 w-full rounded-xl object-cover" />}
        {m.attachment_type === "audio" && m.attachment_url && (
          <audio className="mb-2 w-full" controls src={imgUrl ?? undefined} />
        )}
        {showText && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
        <div className={`mt-1 flex items-center gap-1 text-[10px] ${own ? "text-cyan-100/90" : "text-gray-500"}`}>
          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {own && m.read && <CheckCheck className="ml-0.5 inline h-3.5 w-3.5 opacity-90" />}
        </div>
      </div>
    </div>
  );
}
