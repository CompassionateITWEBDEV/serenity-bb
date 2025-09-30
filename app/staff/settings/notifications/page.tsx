"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function StaffSettingsNotificationPrefsPage() {
  const router = useRouter();
  const [prefs, set] = useState({ email: true, sms: false, push: true });

  async function onSave() {
    // TODO: persist prefs to API
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/staff/dashboard")}
            className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold">Notification Preferences</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <ToggleRow label="Email notifications" checked={prefs.email} onChange={(v)=>set(s=>({...s,email:v}))} />
            <ToggleRow label="SMS notifications" checked={prefs.sms} onChange={(v)=>set(s=>({...s,sms:v}))} />
            <ToggleRow label="Push notifications" checked={prefs.push} onChange={(v)=>set(s=>({...s,push:v}))} />
            <div className="pt-2">
              <Button className="w-full" onClick={onSave}>Save preferences</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 rounded-full p-0.5 transition ${checked ? "bg-cyan-500" : "bg-slate-300"}`}
        aria-pressed={checked}
      >
        <span className={`block h-5 w-5 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}
