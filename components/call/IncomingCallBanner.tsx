"use client";
import { Button } from "@/components/ui/button";

export default function IncomingCallBanner({
  callerName,
  mode,
  onAccept,
  onDecline,
}: {
  callerName: string;
  mode: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed left-1/2 top-4 z-[70] -translate-x-1/2 rounded-xl border bg-white/95 px-3 py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center gap-3 text-sm">
        <span>{mode === "audio" ? "📞" : "📹"} Incoming {mode} call from <b>{callerName}</b></span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={onAccept}>Accept</Button>
          <Button size="sm" variant="outline" onClick={onDecline}>Decline</Button>
        </div>
      </div>
    </div>
  );
}
