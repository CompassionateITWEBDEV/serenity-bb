"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity, LogOut, ArrowLeft, MessageSquare } from "lucide-react";
import Groups from "@/components/staff/Groups";
import DirectMessages from "@/components/staff/DirectMessages";
import { logout } from "@/lib/staff";

export default function StaffMessagesPage() {
  const router = useRouter();

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

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700">
            <div className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              <MessageSquare className="h-5 w-5 text-cyan-700" />
            </div>
            <h2 className="text-xl font-semibold leading-none">Messages</h2>
          </div>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/staff/dashboard")}>
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>

        {/* Web panels: no mobile dock inside */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="w-full">
            <Groups />
          </div>
          <div className="w-full">
            <DirectMessages />
          </div>
        </div>
      </main>
    </div>
  );
}
