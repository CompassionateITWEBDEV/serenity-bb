"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Star } from "lucide-react";

interface StaffVerificationStatsProps {
  staffId: string;
}

interface Stats {
  totalVerifications: number;
  averageRating: number | null;
}

export default function StaffVerificationStats({ staffId }: StaffVerificationStatsProps) {
  const [stats, setStats] = useState<Stats>({ totalVerifications: 0, averageRating: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Prefer API with server-side auth (service role fallback)
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const res = await fetch(`/api/staff/verifications?staffId=${encodeURIComponent(staffId)}` , {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Failed to load verification stats:", err);
          return;
        }

        const body = await res.json();
        const totalVerifications = body?.stats?.totalVerifications ?? (body?.verifications?.length ?? 0);
        const averageRating = body?.stats?.averageRating ?? null;
        if (!cancelled) setStats({ totalVerifications, averageRating });
      } catch (e) {
        console.error("Error loading verification stats:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [staffId]);

  return (
    <Card className="rounded-xl">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-4 w-4 mr-1" /> Verified
          </Badge>
          <span className="text-sm text-slate-600">
            {loading ? "Loading…" : `${stats.totalVerifications} patient verification${stats.totalVerifications === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="text-sm text-slate-700 flex items-center gap-1">
          <Star className="h-4 w-4 text-amber-500" />
          {loading ? "—" : stats.averageRating ? stats.averageRating.toFixed(1) : "No ratings"}
        </div>
      </CardContent>
    </Card>
  );
}


