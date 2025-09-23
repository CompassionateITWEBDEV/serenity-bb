// components/dashboard/welcome-banner.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Film, Target, ClipboardList } from "lucide-react";

/**
 * Why: unify greeting + "new/existing" status using real data counts.
 */
type Counts = {
  appts: number;
  videos: number;
  milestones: number;
  goals: number;
};

export default function WelcomeBanner() {
  const { isAuthenticated, loading, patient, user } = useAuth();
  const patientId = isAuthenticated ? (patient?.user_id || patient?.id || user?.id) : null;

  const [firstName, setFirstName] = useState<string>("there");
  const [counts, setCounts] = useState<Counts>({ appts: 0, videos: 0, milestones: 0, goals: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = useMemo(() => {
    const total = counts.appts + counts.videos + counts.milestones + counts.goals;
    return total === 0;
  }, [counts]);

  // Load basic profile + counts
  useEffect(() => {
    if (!patientId || loading) return;
    let cancel = false;

    async function load() {
      setBusy(true);
      setError(null);
      try {
        // patients table is the source of truth for profile info
        const [{ data: p }, appts, vids, miles, goals] = await Promise.all([
          supabase.from("patients").select("first_name, full_name").eq("user_id", patientId).single(),
          supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
          supabase.from("video_submissions").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
          supabase.from("treatment_milestones").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
          supabase.from("weekly_goals_plan").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
        ]);

        if (!cancel) {
          const name =
            p?.first_name?.trim() ||
            patient?.firstName ||
            patient?.first_name ||
            p?.full_name?.split(" ")?.[0] ||
            "there";

          setFirstName(name);
          setCounts({
            appts: appts.count ?? 0,
            videos: vids.count ?? 0,
            milestones: miles.count ?? 0,
            goals: goals.count ?? 0,
          });
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancel) setBusy(false);
      }
    }

    load();

    // soft refresh on window focus (keeps banner fresh)
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancel = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [patientId, loading, patient]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-serif font-bold text-gray-900">
          {isNew ? "Welcome," : "Welcome back,"} {firstName}!
        </h1>
        <Badge className={isNew ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}>
          {isNew ? "New patient" : "Existing patient"}
        </Badge>
      </div>
      <p className="text-gray-600">
        {isNew
          ? "Let’s get you started. You can book your first appointment, record a quick check-in, or set weekly goals."
          : "Here’s your recovery progress and upcoming activities."}
      </p>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Mini stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="h-5 w-5" />} label="Appointments" value={counts.appts} loading={busy} />
        <StatCard icon={<Film className="h-5 w-5" />} label="Video submissions" value={counts.videos} loading={busy} />
        <StatCard icon={<Target className="h-5 w-5" />} label="Weekly goals" value={counts.goals} loading={busy} />
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Milestones" value={counts.milestones} loading={busy} />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            {icon}
            <span className="text-sm">{label}</span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {loading ? <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse" /> : value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
