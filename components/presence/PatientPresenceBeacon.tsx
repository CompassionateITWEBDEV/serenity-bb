"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function PatientPresenceBeacon() {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;

      const ch = supabase.channel(`online:${uid}`, {
        config: { presence: { key: uid } },
      });

      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          const ping = () => ch.track({ online: true, at: Date.now() });
          ping();
          interval = setInterval(ping, 5000);
        }
      });

      window.addEventListener("beforeunload", () => {
        try { supabase.removeChannel(ch); } catch {}
      });
    })();

    return () => { if (interval) clearInterval(interval); };
  }, []);

  return null;
}
