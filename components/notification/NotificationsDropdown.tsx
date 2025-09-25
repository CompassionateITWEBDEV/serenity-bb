"use client";

import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationsMini } from "@/hooks/use-notifications-mini";

// minimal classnames joiner
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
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

export function NotificationsDropdown() {
  const { items, unreadCount, loading, markRead, markAllRead, refresh } = useNotificationsMini(8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={refresh}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <Check className="mr-1 h-3.5 w-3.5" /> Mark all
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-96 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">You’re all caught up.</div>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => {
                const card = (
                  <div
                    className={cx(
                      "relative rounded-lg border p-3 text-left transition-colors",
                      n.read ? "bg-white hover:bg-gray-50" : "bg-blue-50/70 border-blue-200 hover:bg-blue-50"
                    )}
                    onClick={() => !n.read && markRead(n.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !n.read && markRead(n.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cx(
                          "mt-1 h-2.5 w-2.5 rounded-full",
                          n.read ? "bg-zinc-300" : "bg-blue-600"
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cx("truncate text-sm font-medium", n.read ? "text-gray-800" : "text-gray-900")}>
                          {n.title ?? "Notification"}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{n.body}</p>
                        )}
                        <p className="mt-1 text-[11px] text-gray-500">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} prefetch={false} className="block">
                        {card}
                      </Link>
                    ) : (
                      card
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/notifications">Open full inbox</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
