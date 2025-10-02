"use client";

import { useEffect, useMemo, useState } from "react";
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

type Patient = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone_number?: string | null;
  avatar?: string | null;
  created_at: string;
};

type CareTeamRow = {
  patient_id: string;
  staff_id: string;
  role_on_team?: string | null;
  is_primary?: boolean;
  added_at?: string;
  patients: Patient; // joined row
};

export default function StaffPatientInboxPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    ),
    []
  );

  const [assignedPatients, setAssignedPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper: replace/insert a patient in state
  function upsertPatient(p: Patient) {
    setAssignedPatients((prev) => {
      const idx = prev.findIndex((x) => x.user_id === p.user_id);
      if (idx === -1) return [p, ...prev];
      const next = prev.slice();
      next[idx] = { ...next[idx], ...p };
      return next;
    });
  }

  // Helper: remove patient if assignment removed
  function removePatient(patientId: string) {
    setAssignedPatients((prev) => prev.filter((p) => p.user_id !== patientId));
  }

  useEffect(() => {
    let mounted = true;
    let staffId: string;

    async function boot() {
      // get auth user (staff)
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        router.push("/staff/login");
        return;
      }
      staffId = auth.user.id;

      // load assignments + joined patients
      const { data, error } = await supabase
        .from("patient_care_team")
        .select(`
          patient_id,
          staff_id,
          role_on_team,
          is_primary,
          added_at,
          patients:patient_id (
            user_id, full_name, email, phone_number, avatar, created_at
          )
        `)
        .eq("staff_id", staffId)
        .order("added_at", { ascending: false });

      if (!mounted) return;
      if (error) {
        console.error("Failed to load assigned patients:", error.message);
      } else {
        const pts = (data as CareTeamRow[]).map((r) => r.patients).filter(Boolean);
        setAssignedPatients(pts);
      }
      setLoading(false);

      // Build filter for patient updates
      const ids = (data || []).map((r: any) => r.patient_id);
      const idList = ids.length ? `in.(${ids.join(",")})` : null;

      // Realtime: assignments (only for this staff)
      const careTeamCh = supabase
        .channel("pct-" + staffId)
        .on(
          "postgres_changes",
          { schema: "public", table: "patient_care_team", event: "INSERT", filter: `staff_id=eq.${staffId}` },
          async (payload) => {
            const pid = (payload.new as any).patient_id as string;
            // fetch the joined patient once
            const { data: row } = await supabase
              .from("patients")
              .select("user_id, full_name, email, phone_number, avatar, created_at")
              .eq("user_id", pid)
              .maybeSingle();
            if (row && mounted) upsertPatient(row as Patient);
          }
        )
        .on(
          "postgres_changes",
          { schema: "public", table: "patient_care_team", event: "DELETE", filter: `staff_id=eq.${staffId}` },
          (payload) => {
            const pid = (payload.old as any).patient_id as string;
            if (mounted) removePatient(pid);
          }
        )
        .subscribe();

      // Realtime: patient record updates for assigned ids
      const patientsCh = supabase
        .channel("patients-upd-" + staffId)
        .on(
          "postgres_changes",
          {
            schema: "public",
            table: "patients",
            event: "UPDATE",
            ...(idList ? { filter: `user_id=${idList}` } : {}),
          },
          (payload) => {
            const p = payload.new as Patient;
            if (mounted) upsertPatient(p);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(careTeamCh);
        supabase.removeChannel(patientsCh);
      };
    }

    boot();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

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
              <Activity className="h-3.5 w-3.5" /> Live · {assignedPatients.length} patients
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
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/staff/dashboard")}>
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>

        <div className="grid">
          {loading ? (
            <p className="text-slate-500">Loading assigned patients…</p>
          ) : (
            // Expect PatientInbox to accept a `patients` prop; if not, I can refactor it next.
            <PatientInbox
              patients={assignedPatients}
              onNewGroup={() => console.log("new patient group")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
