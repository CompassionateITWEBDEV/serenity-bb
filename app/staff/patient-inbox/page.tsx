"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Activity,
  ArrowLeft,
  Home as HomeIcon,
  TestTube2,
  MessageSquare,
  Radio as RadioIcon,
  EyeOff,
  Bell,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";
import PatientInbox from "@/components/staff/PatientInbox";

/* why: tiny helper to keep an animated flash on new events */
function FlashBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs animate-pulse">
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
      className={`h-10 w-10 rounded-full grid place-items-center transition ${
        active
          ? "bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function StaffPatientInboxPage() {
  const router = useRouter();

  // Supabase browser client (public anon key)
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      ),
    []
  );

  const [patientsCount, setPatientsCount] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      // why: count quickly without loading heavy data
      const { count } = await supabase
        .from("patients")
        .select("*", { count: "estimated", head: true });
      if (!mounted) return;
      setPatientsCount(typeof count === "number" ? count : 0);
    }

    loadInitial();

    // Realtime: new patients registration
    const channel = supabase
      .channel("realtime-patients")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "patients" },
        (payload) => {
          setPatientsCount((c) => (typeof c === "number" ? c + 1 : 1));
          setRefreshKey((k) => k + 1); // remount inbox to refetch, minimal integration
          setFlash("New patient registered");
          if (flashTimer.current) window.clearTimeout(flashTimer.current);
          flashTimer.current = window.setTimeout(() => setFlash(null), 2500);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, [supabase]);

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
            {flash && <FlashBadge label={flash} />}
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3.5 w-3.5" />
              Live{typeof patientsCount === "number" ? ` · ${patientsCount} patients` : ""}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Quick nav */}
        <div className="flex items-center gap-3">
          <IconPill onClick={() => router.push("/staff/dashboard")} aria="Home">
            <HomeIcon className="h-5 w-5" />
          </IconPill>
          <IconPill onClick={() => router.push("/staff/dashboard?tab=tests")} aria="Drug Tests">
            <TestTube2 className="h-5 w-5" />
          </IconPill>
          <IconPill active aria="Messages / Patient Inbox">
            <MessageSquare className="h-5 w-5" />
          </IconPill>
          <IconPill onClick={() => router.push("/staff/broadcasts")} aria="Broadcasts">
            <RadioIcon className="h-5 w-5" />
          </IconPill>
          <IconPill onClick={() => router.push("/staff/hidden-groups")} aria="Hidden Groups">
            <EyeOff className="h-5 w-5" />
          </IconPill>
          <IconPill onClick={() => router.push("/staff/notifications")} aria="Notifications">
            <Bell className="h-5 w-5" />
          </IconPill>
          <IconPill onClick={() => router.push("/clinician/dashboard")} aria="Clinicians">
            <Users className="h-5 w-5" />
          </IconPill>
          <IconPill onClick={() => router.push("/staff/profile")} aria="Profile Settings">
            <SettingsIcon className="h-5 w-5" />
          </IconPill>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Patient Inbox</h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => router.push("/staff/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>

        {/* Inject refreshKey so inbox remounts on new patient */}
        <div className="grid">
          <PatientInbox key={refreshKey} onNewGroup={() => console.log("new patient group")} />
        </div>
      </main>
    </div>
  );
}
