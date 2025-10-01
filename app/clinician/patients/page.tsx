"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, Settings as SettingsIcon } from "lucide-react";
import PatientsGlyph from "@/components/icons/PatientsGlyph";

// --- local types/mocks (swap to API later)
type Patient = { id: string; name: string };

const MOCKS: Patient[] = [
  { id: "1", name: "James Walker" },
  { id: "2", name: "Ethan Brooks" },
  { id: "3", name: "Liam Carter" },
  { id: "4", name: "Noah Mitchell" },
  { id: "5", name: "Daniel Scott" },
  { id: "6", name: "Emily Harris" },
  { id: "7", name: "Sophia Bennett" },
];

function initials(full: string) {
  const parts = full.trim().split(/\s+/);
  const two = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return two.toUpperCase();
}

type View = "patients" | "settings";

export default function ClinicianPatientsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("patients");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return MOCKS.filter(p => !s || p.name.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              <PatientsGlyph className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Directory</h1>
              <p className="text-xs text-slate-500">Patients</p>
            </div>
          </div>
          <Badge variant="secondary">Live</Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Icon Row — dashboard icon routes to /clinician/dashboard */}
        <div className="flex items-center gap-3">
          <CircleIconButton
            aria="Dashboard"
            onClick={() => router.push("/clinician/dashboard")}
          >
            {/* use the same PatientsGlyph but with a ring to highlight route button style */}
            <div className="h-5 w-5 rounded-full ring-2 ring-cyan-300 grid place-items-center">
              <span className="block h-2 w-2 rounded-full bg-cyan-500" />
            </div>
          </CircleIconButton>

          <CircleIconButton active aria="Patients">
            <PatientsGlyph className="h-5 w-5" />
          </CircleIconButton>

          <CircleIconButton aria="Inbox" onClick={() => router.push("/staff/patient-inbox")}>
            <MessageSquare className="h-5 w-5" />
          </CircleIconButton>

          <CircleIconButton
            aria="Settings"
            active={view === "settings"}
            onClick={() => setView("settings")}
          >
            <SettingsIcon className="h-5 w-5" />
          </CircleIconButton>
        </div>

        {/* Search row */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="pl-8 h-9 w-64 rounded-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Patients ({filtered.length})</span>
          </div>
        </div>

        {/* Patients list */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <ul className="divide-y">
              {filtered.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-500">No results.</li>
              )}
              {filtered.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center text-xs font-semibold">
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 truncate">Patient</div>
                    </div>
                  </div>
                  {/* bell icon placeholder for actions */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-cyan-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
                    <path d="M9 17a3 3 0 0 0 6 0" />
                  </svg>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function CircleIconButton({
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
