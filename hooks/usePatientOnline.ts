"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function usePatientOnline(patientId?: string) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancel = false;

    const fetchOnce = async () => {
      const { data } = await supabase
        .from("v_patient_online")
        .select("online,last_seen")
        .eq("user_id", patientId)
        .maybeSingle();
      if (!cancel && data) setOnline(!!data.online);
    };

    const ch = supabase
      .channel(`presence_db_${patientId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "patient_presence", filter: `user_id=eq.${patientId}` },
        (payload) => {
          const last = new Date(payload.new.last_seen as string).getTime();
          setOnline(Date.now() - last < 20_000);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "patient_presence", filter: `user_id=eq.${patientId}` },
        (payload) => {
          const last = new Date(payload.new.last_seen as string).getTime();
          setOnline(Date.now() - last < 20_000);
        }
      )
      .subscribe();

    void fetchOnce();
    const poll = setInterval(fetchOnce, 20_000);

    return () => {
      cancel = true;
      clearInterval(poll);
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [patientId]);

  return online;
}
