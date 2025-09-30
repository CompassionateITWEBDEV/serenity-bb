"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  ShieldCheck,
  Activity,
  Search,
  Filter,
  Home as HomeIcon,
  HeartPulse,
  Users,
  MessageSquare,
  Settings as SettingsIcon,
  Thermometer,
  Heart,
  Droplets,
  Stethoscope,
} from "lucide-react";

import MobileDock from "@/components/staff/MobileDock";

type VitalRow = {
  id: string;
  name: string;
  avatar?: string;
  hr: number;            // bpm
  bp: string;            // systolic/diastolic
  spo2: number;          // %
  temp: number;          // °F
  updated: string;       // ISO
};

const MOCK: VitalRow[] = [
  { id: "1", name: "James Walker", hr: 78,  bp: "118/76", spo2: 98, temp: 98.4, updated: "2025-09-30T09:30:00Z" },
  { id: "2", name: "Ethan Brooks", hr: 104, bp: "142/92", spo2: 94, temp: 99.7, updated: "2025-09-30T09:10:00Z" },
  { id: "3", name: "Liam Carter",  hr: 60,  bp: "110/70", spo2: 99, temp: 97.9, updated: "2025-09-30T08:58:00Z" },
  { id: "4", name: "Noah Mitchell",hr: 88,  bp: "130/86", spo2: 95, temp: 100.2,updated: "2025-09-30T08:50:00Z" },
  { id: "5", name: "Emily Harris", hr: 72,  bp: "120/80", spo2: 98, temp: 98.2, updated: "2025-09-30T08:40:00Z" },
];

type FilterKey = "all" | "abnormal" | "normal";

export default function ClinicianVitalsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const data = useMemo(() => {
    const search = q.trim().toLowerCase();
    const rows = MOCK.filter(
      (r) => !search || r.name.toLowerCase().includes(search)
    );
    if (filter === "all") return rows;
    return rows.filter((r) => (filter === "abnormal" ? isAbnormal(r) : !isAbnormal(r)));
  }, [q, filter]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Clinician Console</h1>
              <p className="text-xs text-slate-500">Vitals monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3.5 w-3.5" /> Live
            </Badge>
            {/* no logout here */}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Icon Row */}
        <div className="flex items-center gap-3">
          <IconPill onClick={() => router.push("/clinician/dashboard")} aria="Dashboard">
            <HomeIcon className="h-5 w-5" />
          </IconPill>
          <IconPill active aria="Vitals">
            <HeartPulse className="h-5 w-5" />
          </IconPill>
          <IconPill onClick={() => router.push("/clinician/patients")} aria="Patients">
            <Users className="h-5 w-5" />
          </IconPill>
          <IconPill onClick={() => router.push("/staff/patient-inbox")} aria="Messages">
            <MessageSquare className="h-5 w-5" />
          </IconPill>
          <IconPill onClick={() => router.push("/staff/profile")} aria="Settings">
            <SettingsIcon className="h-5 w-5" />
          </IconPill>
        </div>

        {/* Search / Filter */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search patients"
              className="pl-8 h-9 w-64 rounded-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-9 rounded-full"
              onClick={() =>
                setFilter((p) => (p === "all" ? "abnormal" : p === "abnormal" ? "normal" : "all"))
              }
            >
              <Filter className="h-4 w-4 mr-1 text-cyan-600" />
              {filter === "all" ? "All" : filter === "abnormal" ? "Abnormal" : "Normal"}
            </Button>
            <span className="text-sm text-slate-600">Patients ({data.length})</span>
          </div>
        </div>

        {/* Vitals List */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <ul className="divide-y">
              {data.map((r) => {
                const abnormal = isAbnormal(r);
                return (
                  <li
                    key={r.id}
                    className={`px-4 py-3 flex items-center justify-between gap-3 ${abnormal ? "bg-rose-50/50" : "bg-white"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-xs text-slate-500">
                          Updated {new Date(r.updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Chip icon={<Heart className="h-3.5 w-3.5" />} label={`${r.hr} bpm`} bad={r.hr < 50 || r.hr > 100} />
                      <Chip icon={<Stethoscope className="h-3.5 w-3.5" />} label={r.bp} bad={isBpBad(r.bp)} />
                      <Chip icon={<Droplets className="h-3.5 w-3.5" />} label={`${r.spo2}%`} bad={r.spo2 < 95} />
                      <Chip icon={<Thermometer className="h-3.5 w-3.5" />} label={`${r.temp.toFixed(1)}°F`} bad={r.temp >= 100.4} />
                    </div>
                  </li>
                );
              })}
              {data.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-slate-500">No vitals found.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </main>

      <MobileDock />
    </div>
  );
}

/* ---------- helpers ---------- */

function isBpBad(bp: string) {
  const [sysStr, diaStr] = bp.split("/");
  const sys = Number(sysStr);
  const dia = Number(diaStr);
  return sys >= 140 || dia >= 90 || sys <= 90 || dia <= 60;
}

function isAbnormal(r: VitalRow) {
  return r.hr < 50 || r.hr > 100 || isBpBad(r.bp) || r.spo2 < 95 || r.temp >= 100.4;
}

function Chip({
  icon,
  label,
  bad,
}: {
  icon: React.ReactNode;
  label: string | number;
  bad?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border whitespace-nowrap ${
        bad ? "text-rose-700 bg-rose-50 border-rose-200" : "text-slate-700 bg-slate-50 border-slate-200"
      }`}
      title={String(label)}
    >
      {icon}
      {label}
    </span>
  );
}

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
        ${active ? "bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300"
                 : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
    >
      {children}
    </button>
  );
}
