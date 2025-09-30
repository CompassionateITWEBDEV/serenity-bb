"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Filter,
  HeartPulse,
  Search,
  Users,
  MessageSquare,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import MobileDock from "@/components/staff/MobileDock";
import ProfileSettings from "@/components/ProfileSettings";
import DashboardGlyph from "@/components/icons/DashboardGlyph";

// --- local types/mocks (swap to API when ready)
type Clinician = {
  id: string;
  name: string;
  role: string;
  subtitle: string;
  avatar: string;
};

const MOCKS: Clinician[] = [
  { id: "1", name: "Dr. Marlin Cooper", role: "Addiction Recovery Consultant", subtitle: "Clinicians/ Staff", avatar: "/avatars/1.png" },
  { id: "2", name: "Dr. Sarah Jennings", role: "Substance Abuse Counselor", subtitle: "Clinicians/ Staff", avatar: "/avatars/2.png" },
  { id: "3", name: "Dr. Emily Roberts", role: "Behavioral Health Specialist", subtitle: "Clinicians/ Staff", avatar: "/avatars/3.png" },
  { id: "4", name: "Dr. Maria Gonzalez", role: "Rehabilitation Physician (Physiatrist)", subtitle: "Clinicians/ Staff", avatar: "/avatars/4.png" },
  { id: "5", name: "Dr. Aisha Rahman", role: "Mental Health & Addiction Therapist", subtitle: "Clinicians/ Staff", avatar: "/avatars/5.png" },
  { id: "6", name: "Dr. John Lee", role: "Addiction Medicine Specialist", subtitle: "Clinicians/ Staff", avatar: "/avatars/6.png" },
];

type View = "directory" | "settings";

export default function ClinicianDashboardPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("directory");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCKS.filter((c) => !q || c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              {/* Dashboard brand mark */}
              <DashboardGlyph className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Clinician Console</h1>
              <p className="text-xs text-slate-500">Directory & messaging</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">Live</Badge>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => router.push("/logout")}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Icon row */}
        <div className="flex items-center gap-3">
          <IconPill active={view === "directory"} onClick={() => setView("directory")} aria="Dashboard">
            <DashboardGlyph className="h-5 w-5" />
          </IconPill>
          <IconPill aria="Vitals" onClick={() => router.push("/clinician/vitals")}><HeartPulse className="h-5 w-5" /></IconPill>
          <IconPill aria="Patients" onClick={() => router.push("/clinician/patients")}><Users className="h-5 w-5" /></IconPill>
          <IconPill aria="Messages" onClick={() => router.push("/clinician/inbox")}><MessageSquare className="h-5 w-5" /></IconPill>
          <IconPill active={view === "settings"} onClick={() => setView("settings")} aria="Settings"><SettingsIcon className="h-5 w-5" /></IconPill>
        </div>

        {/* Search / Filter */}
        {view === "directory" && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="pl-8 h-9 w-64 rounded-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9 rounded-full">
                  <Filter className="h-4 w-4 mr-1 text-cyan-600" /> Filter
                </Button>
                <span className="text-sm text-slate-600">Clinicians ({filtered.length})</span>
              </div>
            </div>

            {/* Directory list */}
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <ul className="divide-y">
                  {filtered.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden">
                        {/* Why: keeps layout even if no avatar asset is present */}
                        <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.name}</div>
                        <div className="text-xs text-slate-500 truncate">{c.role}</div>
                      </div>
                    </li>
                  ))}
                  {filtered.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-slate-500">No results.</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        {view === "settings" && (
          <section>
            <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
            <div className="mt-3"><ProfileSettings /></div>
          </section>
        )}
      </main>

      <MobileDock />
    </div>
  );
}

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
