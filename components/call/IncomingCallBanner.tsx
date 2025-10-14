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
    <div className="flex items-center gap-3 rounded-lg border bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100">
      <span>
        {mode === "audio" ? "📞" : "📹"} Incoming {mode} call from <b>{callerName}</b>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={onAccept}>
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={onDecline}>
          Decline
        </Button>
      </div>
    </div>
  );
}
