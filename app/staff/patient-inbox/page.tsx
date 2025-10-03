"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Activity, ArrowLeft, Home as HomeIcon, TestTube2,
  MessageSquare, Radio as RadioIcon, EyeOff, Bell, Users, Settings as SettingsIcon
} from "lucide-react";
import PatientInbox from "@/components/staff/PatientInbox";

type PatientRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  avatar: string | null;
  created_at: string;
  role_on_team: string | null;
  is_primary: boolean;
  added_at: string;
};

function IconPill({
  children, active, onClick, aria,
}: { children: React.ReactNode; active?: boolean; onClick?: () => void; aria: string }) {
  return (
    <button
      type="button" aria-label={aria} onClick={onClick}
      className={`h-10 w-10 rounded-full grid place-items-center transition ${active
        ? "bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
    >{children}</button>
  );
}

export default function StaffPatientInboxPage() {
  const router = useRouter();

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const assignedIdsRef = useRef<Set<string>>(new Set());
  const staffIdRef = useRef<string | null>(null);

  const upsertPatient = (p: PatientRow) => {
    setPatients(prev => {
      const i = prev.findIndex(x => x.user_id === p.user_id);
      if (i === -1) return [p, ...prev];
      const copy = prev.slice(); copy[i] = { ...copy[i], ...p }; return copy;
    });
  };
  const removePatient = (id: string) => {
    assignedIdsRef.current.delete(id);
    setPatients(prev => prev.filter(p => p.user_id !== id));
  };

  // FIX: reverse-join from `patients` via explicit FK name
  async function fetchAssignedFor(uid: string): Promise<PatientRow[]> {
    const { data, error } = await supabase
      .from("patients")
      .select(`
        user_id, full_name, email, phone_number, avatar, created_at,
        pct:patient_care_team!patient_care_team_patient_id_fkey!inner(
          staff_id, role_on_team, is_primary, added_at
        )
      `)
      .eq("pct.staff_id", uid)
      .order("pct.added_at", { ascending: false });

    if (error) throw error;

    const rows: PatientRow[] = (data as any[] ?? []).map((r) => ({
      user_id: r.user_id,
      full_name: r.full_name,
      email: r.email,
      phone_number: r.phone_number,
      avatar: r.avatar,
      created_at: r.created_at,
      role_on_team: r.pct?.role_on_team ?? null,
      is_primary: Boolean(r.pct?.is_primary),
      added_at: r.pct?.added_at ?? r.created_at,
    }));

    return rows;
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setErrorMsg("");

      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr || !auth?.user) { router.push("/staff/login"); return; }
      const staffId = auth.user.id;
      staffIdRef.current = staffId;

      try {
        const list = await fetchAssignedFor(staffId);
        if (!mounted) return;
        assignedIdsRef.current = new Set(list.map(x => x.user_id));
        setPatients(list);
      } catch (e: any) {
        if (mounted) setErrorMsg(e?.message ?? "Failed to load patients.");
      } finally {
        if (mounted) setLoading(false);
      }

      // Realtime: care-team changes for THIS staff
      const chAssign = supabase
        .channel(`pct-${staffId}`)
        .on("postgres_changes",
          { schema: "public", table: "patient_care_team", event: "INSERT", filter: `staff_id=eq.${staffId}` },
          async (payload) => {
            const pid = (payload.new as any)?.patient_id as string | undefined;
            if (!pid || assignedIdsRef.current.has(pid)) return;

            const { data: pr } = await supabase
              .from("patients")
              .select("user_id, full_name, email, phone_number, avatar, created_at")
              .eq("user_id", pid)
              .maybeSingle();

            if (!pr) return;
            const row: PatientRow = {
              user_id: pr.user_id,
              full_name: pr.full_name,
              email: pr.email,
              phone_number: pr.phone_number,
              avatar: pr.avatar,
              created_at: pr.created_at,
              role_on_team: (payload.new as any)?.role_on_team ?? null,
              is_primary: Boolean((payload.new as any)?.is_primary),
              added_at: (payload.new as any)?.added_at ?? new Date().toISOString(),
            };
            assignedIdsRef.current.add(pid);
            if (mounted) upsertPatient(row);
          }
        )
        .on("postgres_changes",
          { schema: "public", table: "patient_care_team", event: "DELETE", filter: `staff_id=eq.${staffId}` },
          (payload) => {
            const pid = (payload.old as any)?.patient_id as string | undefined;
            if (!pid) return;
            if (mounted) removePatient(pid);
          }
        )
        .subscribe();

      // Realtime: patient profile updates
      const chPatients = supabase
        .channel(`patients-upd-${staffId}`)
        .on("postgres_changes",
          { schema: "public", table: "patients", event: "UPDATE" },
          (payload) => {
            const p = payload.new as any;
            if (!p?.user_id || !assignedIdsRef.current.has(p.user_id)) return;
            upsertPatient({
              user_id: p.user_id,
              full_name: p.full_name,
              email: p.email,
              phone_number: p.phone_number,
              avatar: p.avatar,
              created_at: p.created_at,
              role_on_team: patients.find(x => x.user_id === p.user_id)?.role_on_team ?? null,
              is_primary: patients.find(x => x.user_id === p.user_id)?.is_primary ?? false,
              added_at: patients.find(x => x.user_id === p.user_id)?.added_at ?? p.created_at,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(chAssign);
        supabase.removeChannel(chPatients);
      };
    }

    void init();
    return () => { mounted = false; };
  }, [router]);

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
              <Activity className="h-3.5 w-3.5" /> Live · {patients.length} patients
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <IconPill onClick={() => router.push("/staff/dashboard")} aria="Home"><HomeIcon className="h-5 w-5" /></IconPill>
          <IconPill onClick={() => router.push("/staff/dashboard?tab=tests")} aria="Drug Tests"><TestTube2 className="h-5 w-5" /></IconPill>
          <IconPill active aria="Messages / Patient Inbox"><MessageSquare className="h-5 w-5" /></IconPill>
          <IconPill onClick={() => router.push("/staff/broadcasts")} aria="Broadcasts"><RadioIcon className="h-5 w-5" /></IconPill>
          <IconPill onClick={() => router.push("/staff/hidden-groups")} aria="Hidden Groups"><EyeOff className="h-5 w-5" /></IconPill>
          <IconPill onClick={() => router.push("/staff/notifications")} aria="Notifications"><Bell className="h-5 w-5" /></IconPill>
          <IconPill onClick={() => router.push("/clinician/dashboard")} aria="Clinicians"><Users className="h-5 w-5" /></IconPill>
          <IconPill onClick={() => router.push("/staff/profile")} aria="Profile Settings"><SettingsIcon className="h-5 w-5" /></IconPill>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Patient Inbox</h2>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/staff/dashboard")}>
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>

        <div className="grid">
          {loading && <p className="text-slate-500">Loading assigned patients…</p>}
          {!loading && errorMsg && <p className="text-red-600">{errorMsg}</p>}
          {!loading && !errorMsg && (
            <PatientInbox patients={patients} onNewGroup={() => console.log("new group")} />
          )}
        </div>
      </main>
    </div>
  );
}
