"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Incoming = {
  convId: string;
  room: string;
  mode: "audio" | "video";
  fromName: string;
};

function ensureSubscribed(
  ch: ReturnType<typeof supabase.channel>,
  timeoutMs = 8000
): Promise<ReturnType<typeof supabase.channel>> {
  // @ts-ignore internal state present at runtime
  if (ch.state === "joined") return Promise.resolve(ch);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMED_OUT")), timeoutMs);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve(ch);
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        reject(new Error(status));
      }
    });
  });
}

export default function GlobalCallListener({
  convIds,
  onAccept,
}: {
  convIds: string[];
  onAccept: (info: Incoming) => void;
}) {
  const chansRef = useRef<Record<string, ReturnType<typeof supabase.channel>>>({});
  const [incoming, setIncoming] = useState<Incoming | null>(null);

  const ids = useMemo(
    () => Array.from(new Set(convIds.filter(Boolean))),
    [convIds]
  );

  useEffect(() => {
    // subscribe to any NEW convIds
    ids.forEach((id) => {
      if (chansRef.current[id]) return;
      const ch = supabase.channel(`video_${id}`, { config: { broadcast: { self: true } } });
      chansRef.current[id] = ch;

      ch.on("broadcast", { event: "ring" }, (p) => {
        const { room, fromName, mode } = (p?.payload ?? {}) as Incoming;
        setIncoming({ convId: id, room, mode: mode || "audio", fromName: fromName || "Patient" });
      })
      .on("broadcast", { event: "hangup" }, () => {
        setIncoming(null);
      });

      ensureSubscribed(ch).catch((e) => {
        console.warn("[GlobalCallListener] subscribe failed:", id, e);
      });
    });

    // Unsubscribe channels for removed ids
    Object.keys(chansRef.current).forEach((id) => {
      if (!ids.includes(id)) {
        try { supabase.removeChannel(chansRef.current[id]); } catch {}
        delete chansRef.current[id];
      }
    });

    return () => {
      // cleanup on unmount
      Object.values(chansRef.current).forEach((ch) => {
        try { supabase.removeChannel(ch); } catch {}
      });
      chansRef.current = {};
    };
  }, [ids]);

  return (
    <>
      {incoming && (
        <div className="fixed z-[90] right-4 bottom-4 max-w-sm rounded-xl border bg-emerald-50 p-3 text-emerald-900 shadow-lg dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-50">
          <div className="text-sm">
            {incoming.mode === "audio" ? "📞" : "📹"} Incoming {incoming.mode} call from <b>{incoming.fromName}</b>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onAccept(incoming);
                setIncoming(null);
              }}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // also notify caller to stop ring sound
                const ch = chansRef.current[incoming.convId];
                try { ch?.send({ type: "broadcast", event: "hangup", payload: {} }); } catch {}
                setIncoming(null);
              }}
            >
              Decline
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
