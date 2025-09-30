"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Activity, LogOut, ArrowLeft,
  Home as HomeIcon, TestTube2, MessageSquare, Users, Settings as SettingsIcon,
  Radio as RadioIcon
} from "lucide-react";

import Broadcasts from "@/components/staff/Broadcasts";
import { logout } from "@/lib/staff";

function IconPill({
  children, active, onClick, aria,
}: { children: React.ReactNode; active?: boolean; onClick?: () => void; aria: string }) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className={`h-10 w-10 rounded-full grid place-items-center transition
        ${active ? "bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300"
                 : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
    >
      {children}
    </button>
  );
}

export default function StaffBroadcastsPage() {
  const router = useRouter();

  async function onLogout() {
    await logout();
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
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
            <Button variant="outline" size="sm" className="gap-1" onClick={onLogout}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <IconPill onClick={() => router.push("/staff/dashboard")} aria="Home"><HomeIcon className="h-5 w-5" /></IconPill>
          <IconPill onClick={() => router.push("/staff/dashboard?tab=tests")} aria="Drug Tests"><TestTube2 className="h-5 w-5" /></IconPill>
          <IconPill onClick={() => router.push("/staff/patient-inbox")} aria="Messages"><MessageSquare className="h-5 w-5" /></IconPill>
          <IconPill onClick={() => router.push("/clinician/patients")} aria="Patients"><Users className="h-5 w-5" /></IconPill>
          <IconPill onClick={() => router.push("/staff/settings")} aria="Settings"><SettingsIcon className="h-5 w-5" /></IconPill>
          <IconPill active aria="Broadcasts"><RadioIcon className="h-5 w-5" /></IconPill>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Broadcast</h2>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/staff/dashboard")}>
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>

        <div className="grid">
          <Broadcasts onNew={() => console.log("new broadcast")} />
        </div>
      </main>
    </div>
  );
}
