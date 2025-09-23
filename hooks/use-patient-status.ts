// hooks/use-patient-status.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type PatientCounts = {
  appts: number;
  videos: number;
  milestones: number;
  goals: number;
};

export function usePatientStatus() {
  const { isAuthenticated, loading, patient, user } = useAuth();
  const patientId = isAuthenticated ? (patient?.user_id || patient?.id || user?.id) : null;

  const [counts, setCounts] = useState<PatientCounts>({ appts: 0, videos: 0, milestones: 0, goals: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isNew = useMemo(
    () => counts.appts + counts.videos + counts.milestones + counts.goals === 0,
    [counts]
  );

  useEffect(() => {
    if (!patientId || loading) return;
    let cancel = false;

    (async () => {
      setBusy(true);
      setErr(null);
      try {
        const [appts, vids, miles, goals] = await Promise.all([
          supabase.from("appointments").select("id", { head: true, count: "exact" }).eq("patient_id", patientId),
          supabase.from("video_submissions").select("id", { head: true, count: "exact" }).eq("patient_id", patientId),
          supabase.from("treatment_milestones").select("id", { head: true, count: "exact" }).eq("patient_id", patientId),
          supabase.from("weekly_goals_plan").select("id", { head: true, count: "exact" }).eq("patient_id", patientId),
        ]);
        if (!cancel) {
          setCounts({
            appts: appts.count ?? 0,
            videos: vids.count ?? 0,
            milestones: miles.count ?? 0,
            goals: goals.count ?? 0,
          });
        }
      } catch (e: any) {
        if (!cancel) setErr(e?.message ?? "Failed to load");
      } finally {
        if (!cancel) setBusy(false);
      }
    })();

    return () => { cancel = true; };
  }, [patientId, loading]);

  return { isNew, counts, loading: busy, error: err };
}
