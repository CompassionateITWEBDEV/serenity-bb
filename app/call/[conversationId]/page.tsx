"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { sendRing, sendHangupToUser, userRingChannel } from "@/lib/webrtc/signaling";
import CallScreen from "@/components/call/CallScreen";
import Swal from "sweetalert2";

export default function CallPage() {
  const router = useRouter();
  const params = useParams<{ conversationId: string }>();
  const sp = useSearchParams();

  const conversationId = params.conversationId;
  const role = (sp.get("role") || "caller") as "caller" | "callee";
  const mode = (sp.get("mode") || "audio") as "audio" | "video";
  const peerUserId = sp.get("peer") || "";
  const peerName = sp.get("peerName") || "Contact";

  const [me, setMe] = React.useState<{ id: string; name: string } | null>(null);
  const [open, setOpen] = React.useState(true);
  const [booted, setBooted] = React.useState(false);

  React.useEffect(() => {
    if (!conversationId || !peerUserId) {
      Swal.fire("Missing info", "Conversation or peer is missing.", "error").then(() =>
        router.replace("/dashboard/messages")
      );
    }
  }, [conversationId, peerUserId, router]);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        await Swal.fire("Login required", "Please sign in and try again.", "info");
        router.replace("/login");
        return;
      }
      const name = data.user?.email || "Me";
      setMe({ id: uid, name });
    })();
  }, [router]);

  // Caller: preflight + send ring (only once)
  React.useEffect(() => {
    if (!me?.id || !conversationId || !peerUserId) return;
    if (role !== "caller" || booted) return;

    (async () => {
      try {
        // permissions first so users see the prompt before ringing
        const constraints: MediaStreamConstraints = {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: mode === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        s.getTracks().forEach((t) => t.stop());
      } catch (err: any) {
        await Swal.fire(
          "Permissions required",
          err?.message || "Please allow microphone/camera to start a call.",
          "info"
        );
        router.back();
        return;
      }

      try {
        await sendRing(peerUserId, {
          conversationId,
          fromId: me.id,
          fromName: me.name,
          mode,
        });
      } catch (err: any) {
        await Swal.fire("Call failed", err?.message || "Could not ring the other user.", "error");
        router.back();
        return;
      }

      setBooted(true);
    })();
  }, [me?.id, me?.name, conversationId, peerUserId, role, mode, booted, router]);

  // Callee: if peer hangs up, exit
  React.useEffect(() => {
    if (!me?.id) return;
    const ch = userRingChannel(me.id);
    ch.on("broadcast", { event: "hangup" }, (p) => {
      const { conversationId: cid } = (p.payload || {}) as any;
      if (cid && cid !== conversationId) return;
      setOpen(false);
      router.back();
    });
    ch.subscribe();
    return () => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    };
  }, [me?.id, conversationId, router]);

  if (!me) return null;

  return (
    <CallScreen
      open={open}
      onExit={async () => {
        try { await sendHangupToUser(peerUserId, conversationId, me.id); } catch {}
        setOpen(false);
        router.back();
      }}
      conversationId={conversationId}
      role={role}
      mode={mode}
      meId={me.id}
      peerUserId={peerUserId}
      peerName={peerName}
    />
  );
}
