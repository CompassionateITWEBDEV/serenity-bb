// app/staff/messages/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity, LogOut, ArrowLeft } from "lucide-react";

import Groups from "@/components/staff/Groups";
import DirectMessages from "@/components/staff/DirectMessages";
import { logout } from "@/lib/staff";

const ToggleBtn = ({
  active, onClick, children, aria,
}: { active?: boolean; onClick: () => void; children: React.ReactNode; aria: string }) => (
  <button
    aria-label={aria}
    onClick={onClick}
    className={`h-9 px-3 rounded-full inline-flex items-center gap-2 text-sm
      ${active ? "bg-cyan-500 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
  >
    {children}
  </button>
);

export default function StaffMessagesPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"both" | "groups" | "dms">("both"); // icon toggle

  async function onLogout() {
    await logout();
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              {/* app icon */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-600" fill="none" stroke="currentColor">
                <path strokeWidth="2" d="M12 3l9 7-9 7-9-7 9-7z" />
              </svg>
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
            <Button variant="outline" size="sm" className="gap-1" onClick={onLogout}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Title + back + icon toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              {/* messages glyph */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-700" fill="none" stroke="currentColor">
                <path strokeWidth="2" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z"/>
              </svg>
            </span>
            <h2 className="text-xl font-semibold">Messages</h2>
          </div>

          <div className="flex items-center gap-2">
            <ToggleBtn active={mode==="groups"} onClick={()=>setMode("groups")} aria="Show Internal Groups">
              <span className="h-5 w-5 grid place-items-center rounded-full bg-white/20">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M16 11a4 4 0 1 0-8 0"/><path strokeWidth="2" d="M3 21a7 7 0 0 1 18 0"/></svg>
              </span>
              Groups
            </ToggleBtn>
            <ToggleBtn active={mode==="dms"} onClick={()=>setMode("dms")} aria="Show Direct Messages">
              <span className="h-5 w-5 grid place-items-center rounded-full bg-white/20">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"><path strokeWidth="2" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z"/></svg>
              </span>
              Direct
            </ToggleBtn>
            <ToggleBtn active={mode==="both"} onClick={()=>setMode("both")} aria="Show Both">
              Both
            </ToggleBtn>

            <Button variant="ghost" size="sm" className="gap-2 ml-2" onClick={() => router.push("/staff/dashboard")}>
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Panels */}
        {mode === "both" ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="w-full"><Groups /></div>
            <div className="w-full"><DirectMessages /></div>
          </div>
        ) : mode === "groups" ? (
          <div className="w-full"><Groups /></div>
        ) : (
          <div className="w-full"><DirectMessages /></div>
        )}
      </main>
    </div>
  );
}
