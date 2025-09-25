"use client";

import Link from "next/link";
import { cn } from "@/lib/utils"; // if you don't have cn, replace with a simple join helper
import { Clock } from "lucide-react";
import { NotificationRow } from "@/hooks/use-notifications-feed";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export type NotificationCardProps = {
  n: NotificationRow;
  onRead: (id: string) => void;
};

export function NotificationCard({ n, onRead }: NotificationCardProps) {
  const content = (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border p-3 transition-shadow",
        "hover:shadow-md",
        n.read ? "bg-white" : "bg-blue-50/60 border-blue-200"
      )}
      onClick={() => !n.read && onRead(n.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !n.read && onRead(n.id)}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5 h-2.5 w-2.5 rounded-full",
          n.read ? "bg-zinc-300" : "bg-blue-500 animate-pulse"
        )} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className={cn("truncate text-sm font-medium",
              n.read ? "text-gray-800" : "text-gray-900"
            )}>
              {n.title ?? "Notification"}
            </p>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" /> {timeAgo(n.created_at)}
            </span>
          </div>
          {n.body && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-600">
              {n.body}
            </p>
          )}
          {n.kind && (
            <span className="mt-2 inline-flex w-fit rounded-full border px-2 py-0.5 text-[11px] text-gray-700">
              {n.kind}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // If there's a deep link, wrap with <Link>
  return n.href ? (
    <Link href={n.href} prefetch={false} className="block">{content}</Link>
  ) : content;
}
