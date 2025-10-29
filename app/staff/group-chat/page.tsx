// app/staff/group-chat/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Activity,
  Home as HomeIcon,
  TestTube2,
  MessageSquare,
  Radio as RadioIcon,
  EyeOff,
  Bell,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";

import StaffGroupChat from "@/components/staff/StaffGroupChat";

function IconPill({
  children,
  active,
  onClick,
  aria,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  aria: string;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className={`h-10 w-10 rounded-full grid place-items-center transition
        ${
          active
            ? "bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
    >
      {children}
    </button>
  );
}

export default function StaffGroupChatPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Staff Console</h1>
              <p className="text-xs text-slate-500">Care operations at a glance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3.5 w-3.5" /> Live
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Icon row (consistent with dashboard) */}
        <div className="flex items-center gap-3">
          <IconPill onClick={() => router.push("/staff/dashboard")} aria="Dashboard">
            <HomeIcon className="h-5 w-5" />
          </IconPill>

          <IconPill onClick={() => router.push("/staff/dashboard?tab=tests")} aria="Drug Tests">
            <TestTube2 className="h-5 w-5" />
          </IconPill>

          <IconPill onClick={() => router.push("/staff/messages")} aria="Messages">
            <MessageSquare className="h-5 w-5" />
          </IconPill>

          <IconPill onClick={() => router.push("/staff/broadcasts")} aria="Broadcasts">
            <RadioIcon className="h-5 w-5" />
          </IconPill>

          <IconPill onClick={() => router.push("/staff/hidden-groups")} aria="Groups">
            <EyeOff className="h-5 w-5" />
          </IconPill>

          <IconPill onClick={() => router.push("/staff/notifications")} aria="Alerts">
            <Bell className="h-5 w-5" />
          </IconPill>

          <IconPill onClick={() => router.push("/staff/group-chat")} active aria="Group Chat">
            <Users className="h-5 w-5" />
          </IconPill>

          <IconPill onClick={() => router.push("/staff/profile")} aria="Settings">
            <SettingsIcon className="h-5 w-5" />
          </IconPill>
        </div>

        {/* Page header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Group Chat</h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => router.push("/staff/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Content */}
        <div className="grid">
          <StaffGroupChat />
        </div>
      </main>
    </div>
  );
}
