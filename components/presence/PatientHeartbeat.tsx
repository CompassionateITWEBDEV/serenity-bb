"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function PatientHeartbeat() {
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;

      const beat = async () => {
        await supabase
          .from("patient_presence")
          .upsert({ user_id: uid, last_seen: new Date().toISOString() }, { onConflict: "user_id" });
      };

      await beat();                 // initial
      t = setInterval(beat, 10_000); // every 10s
      window.addEventListener("beforeunload", () => { void beat(); });
    })();
    return () => { if (t) clearInterval(t); };
  }, []);
  return null;
}
