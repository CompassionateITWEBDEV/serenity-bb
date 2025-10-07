"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function usePatientHeartbeat() {
  useEffect(() => {
    let fastTimer: ReturnType<typeof setInterval> | null = null;
    let slowTimer: ReturnType<typeof setInterval> | null = null;
    let onlineCh: ReturnType<typeof supabase.channel> | null = null;
    let uid: string | undefined;

    (async () => {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id;
      if (!uid) return;

      // 1) DB heartbeat — instant + 2 quick beats then slow
      const beat = async () => {
        await supabase.rpc("patient_heartbeat"); // uses auth.uid() server-side
      };

      await beat();                  // instant
      fastTimer = setInterval(beat, 1000); // 2 more quick beats in first seconds
      setTimeout(() => {
        if (fastTimer) clearInterval(fastTimer);
        slowTimer = setInterval(beat, 10000); // normal 10s after
      }, 2200);

      // 2) Realtime presence — instant track
      onlineCh = supabase.channel(`online:${uid}`, { config: { presence: { key: uid } } });
      onlineCh.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          const ping = () => onlineCh!.track({ online: true, at: Date.now() });
          ping();              // immediate
          setTimeout(ping, 800);  // a quick repeat to overcome race
        }
      });

      // 3) Also ping on tab focus/visible
      const onFocus = () => { void beat(); onlineCh?.track({ online: true, at: Date.now() }); };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") onFocus();
      });

    })();

    return () => {
      if (fastTimer) clearInterval(fastTimer);
      if (slowTimer) clearInterval(slowTimer);
      try { if (onlineCh) supabase.removeChannel(onlineCh); } catch {}
    };
  }, []);
}
