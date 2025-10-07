"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function usePatientOnline(patientId?: string) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;

    // A) instant read from DB view
    const fetchOnce = async () => {
      const { data } = await supabase
        .from("v_patient_online")
        .select("online,last_seen")
        .eq("user_id", patientId)
        .maybeSingle();
      if (!cancelled && data) setOnline(!!data.online);
    };

    // B) subscribe to DB changes for heartbeat
    const dbCh = supabase
      .channel(`presence_db_${patientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "patient_presence", filter: `user_id=eq.${patientId}` },
        (p) => {
          const last = new Date(p.new.last_seen as string).getTime();
          setOnline(Date.now() - last < 15000);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "patient_presence", filter: `user_id=eq.${patientId}` },
        (p) => {
          const last = new Date(p.new.last_seen as string).getTime();
          setOnline(Date.now() - last < 15000);
        }
      )
      .subscribe();

    // C) Realtime presence channel for instant “green dot”
    const staffKey = `staff-${crypto.randomUUID()}`;
    const rtCh = supabase.channel(`online:${patientId}`, { config: { presence: { key: staffKey } } });
    const computeRtOnline = () => {
      const state = rtCh.presenceState() as Record<string, any[]>;
      const entries = state[patientId] || [];
      return Array.isArray(entries) && entries.length > 0;
    };
    const updateRt = () => setOnline((prev) => computeRtOnline() || prev);

    rtCh
      .on("presence", { event: "sync" }, updateRt)
      .on("presence", { event: "join" }, updateRt)
      .on("presence", { event: "leave" }, updateRt)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try { await rtCh.track({ observer: true, at: Date.now() }); } catch {}
          updateRt();
        }
      });

    // D) do an initial fetch and a short re-check after 800ms (race safety)
    void fetchOnce();
    const short = setTimeout(fetchOnce, 800);

    return () => {
      cancelled = true;
      clearTimeout(short);
      try { supabase.removeChannel(dbCh); } catch {}
      try { supabase.removeChannel(rtCh); } catch {}
    };
  }, [patientId]);

  return online;
}
