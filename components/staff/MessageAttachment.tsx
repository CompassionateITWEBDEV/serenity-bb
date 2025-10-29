"use client";

import { useState, useEffect, useRef } from "react";
import { File, Download, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { urlFromStaffChatPath } from "@/lib/staff-chat-upload";

interface MessageAttachmentProps {
  attachment_url: string | null | undefined;
  attachment_type: "image" | "audio" | "file" | null | undefined;
  isOwnMessage?: boolean;
}

export default function MessageAttachment({
  attachment_url,
  attachment_type,
  isOwnMessage = false,
}: MessageAttachmentProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!attachment_url) {
      setLoading(false);
      return;
    }

    urlFromStaffChatPath(attachment_url)
      .then((publicUrl) => {
        setUrl(publicUrl);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading attachment URL:", error);
        setLoading(false);
      });
  }, [attachment_url]);

  const handleAudioPlay = () => {
    if (!audioRef.current) {
      const audio = new Audio(url || undefined);
      audio.addEventListener("ended", () => setAudioPlaying(false));
      audio.play();
      setAudioPlaying(true);
      audioRef.current = audio;
    } else {
      if (audioPlaying) {
        audioRef.current.pause();
        setAudioPlaying(false);
      } else {
        audioRef.current.play();
        setAudioPlaying(true);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-2 bg-gray-100 rounded text-sm text-gray-600">
        Loading attachment...
      </div>
    );
  }

  if (!url || !attachment_type) {
    return null;
  }

  if (attachment_type === "image") {
    return (
      <div className="mt-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg overflow-hidden max-w-md border border-gray-200"
        >
          <img
            src={url}
            alt="Attachment"
            className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      </div>
    );
  }

  if (attachment_type === "audio") {
    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAudioPlay}
          className="gap-2"
        >
          {audioPlaying ? (
            <>
              <Pause className="h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Play Voice Note
            </>
          )}
        </Button>
      </div>
    );
  }

  // For file type or unknown
  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
      <File className="h-5 w-5 text-gray-500" />
      <span className="flex-1 text-sm text-gray-700">File attachment</span>
      <Button
        variant="outline"
        size="sm"
        asChild
        className="gap-2"
      >
        <a href={url} download target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4" />
          Download
        </a>
      </Button>
    </div>
  );
}

