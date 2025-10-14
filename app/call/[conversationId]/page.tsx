"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function buildIceServers(): RTCIceServer[] {
  const stun = process.env.NEXT_PUBLIC_ICE_STUN || "stun:stun.l.google.com:19302";
  const turn = process.env.NEXT_PUBLIC_ICE_TURN_URI || "";
  const user = process.env.NEXT_PUBLIC_ICE_TURN_USER || "";
  const pass = process.env.NEXT_PUBLIC_ICE_TURN_PASS || "";
  const servers: RTCIceServer[] = [{ urls: [stun] }];
  if (turn && user && pass) servers.push({ urls: [turn], username: user, credential: pass });
  return servers;
}

type SigPayload =
  | { kind: "webrtc-offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-ice"; from: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string };

function Tile({
  videoRef,
  label,
  mirrored = false,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  label: string;
  mirrored?: boolean;
}) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-black/80">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={label === "You"}
        className={`h-full w-full object-contain ${mirrored ? "scale-x-[-1]" : ""}`}
        aria-label={`${label} video`}
        tabIndex={0}
      />
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {label}
      </div>
    </div>
  );
}

export default function CallRoomPage() {
  const router = useRouter();
  const { conversationId } = useParams<{ conversationId: string }>();
  const qs = useSearchParams();

  const roleParam = (qs.get("role") as "caller" | "callee") || "caller";
  const mode = (qs.get("mode") as "audio" | "video") || "audio";
  const peerUserId = qs.get("peer") || "";
  const peerName = decodeURIComponent(qs.get("peerName") || "Peer");

  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<{ id: string; email?: string | null } | null>(null);
  const [meRole, setMeRole] = useState<"staff" | "patient" | "unknown">("unknown");

  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const threadChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // --- role-aware end destinations (change as needed)
  function endRoute(role: "staff" | "patient" | "unknown") {
    if (role === "staff") return "/staff/appointments";
    if (role === "patient") return "/patient/appointments";
    return "/dashboard/messages";
  }

  // --- Supabase auth + role fetch (user_metadata.role → profiles.role)
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!alive) return;
      const user = session.session?.user;
      if (user) {
        setMe({ id: user.id, email: user.email });
        let role: "staff" | "patient" | "unknown" =
          (user.user_metadata?.role as any) || "unknown";
        if (role === "unknown") {
          const { data, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          if (!error && data?.role && (data.role === "staff" || data.role === "patient")) {
            role = data.role;
          }
        }
        setMeRole(role);
        setAuthChecked(true);
        return;
      }
      const { data: userRes } = await supabase.auth.getUser();
      if (userRes.user) {
        setMe({ id: userRes.user.id, email: userRes.user.email });
        setMeRole(
          (userRes.user.user_metadata?.role as "staff" | "patient") || "unknown"
        );
        setAuthChecked(true);
        return;
      }
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.user) {
        const u = refreshed.session.user;
        setMe({ id: u.id, email: u.email });
        setMeRole((u.user_metadata?.role as "staff" | "patient") || "unknown");
        setAuthChecked(true);
      } else {
        const next = encodeURIComponent(location.pathname + location.search);
        router.replace(`/login?next=${next}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  // --- Patient access guard (no SweetAlert)
  useEffect(() => {
    if (!authChecked) return;
    if (meRole === "patient") {
      if (!peerUserId || !conversationId) {
        router.replace(endRoute("patient")); // silent redirect
      }
    }
  }, [authChecked, meRole, peerUserId, conversationId, router]);

  // ---------- WebRTC core ----------
  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.onicecandidate = (ev) => {
      if (ev.candidate && me?.id) {
        sendSignal({ kind: "webrtc-ice", from: me.id, candidate: ev.candidate.toJSON() });
      }
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("connected");
      if (s === "failed" || s === "disconnected" || s === "closed") setStatus("ended");
    };
    pc.ontrack = (ev) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(ev.track);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };

    pcRef.current = pc;
    return pc;
  }, [me?.id]);

  const getConstraints = useCallback((): MediaStreamConstraints => {
    return { audio: true, video: mode === "video" ? { width: 1280, height: 720 } : false };
  }, [mode]);

  // ---------- Signaling on thread_${conversationId} ----------
  const threadChannel = useMemo(() => `thread_${conversationId}`, [conversationId]);

  async function ensureSubscribed(ch: ReturnType<typeof supabase.channel>) {
    await new Promise<void>((res, rej) => {
      const to = setTimeout(() => rej(new Error("subscribe timeout")), 8000);
      ch.subscribe((s) => {
        if (s === "SUBSCRIBED") { clearTimeout(to); res(); }
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") { clearTimeout(to); rej(new Error(String(s))); }
      });
    });
  }

  const sendSignal = useCallback(async (payload: SigPayload) => {
    if (!threadChanRef.current) return;
    await ensureSubscribed(threadChanRef.current).catch(() => {});
    await threadChanRef.current.send({ type: "broadcast", event: "signal", payload }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!conversationId || !me?.id) return;

    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });

    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) return;

      if (msg.kind === "webrtc-offer") {
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
      } else if (msg.kind === "webrtc-answer") {
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.kind === "webrtc-ice") {
        try {
          const pc = ensurePC();
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {}
      } else if (msg.kind === "bye") {
        void endCall(true); // either patient or staff ends → both end
      }
    });

    (async () => { await ensureSubscribed(ch).catch(() => {}); })();
    threadChanRef.current = ch;

    return () => {
      try { supabase.removeChannel(ch); } catch {}
      threadChanRef.current = null;
    };
  }, [conversationId, ensurePC, me?.id, sendSignal, threadChannel]);

  // ---------- Ring peer (for IncomingCallBanner) on user_${peer} ----------
  async function ringPeer() {
    if (!peerUserId || !conversationId || !me?.id) return;
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    try {
      await ensureSubscribed(ch);
      await ch.send({
        type: "broadcast",
        event: "invite",
        payload: { conversationId, fromId: me.id, fromName: me.email || "Caller", mode },
      });
    } finally {
      try { supabase.removeChannel(ch); } catch {}
    }
  }

  async function byePeer() {
    if (!peerUserId || !conversationId) return;
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    try {
      await ensureSubscribed(ch);
      await ch.send({ type: "broadcast", event: "bye", payload: { conversationId } });
    } finally {
      try { supabase.removeChannel(ch); } catch {}
    }
  }

  // ---------- Start flow ----------
  const startOrPrep = useCallback(async () => {
    if (!me?.id) return;

    setStatus("connecting");

    localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

    const pc = ensurePC();
    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    if (roleParam === "caller") {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video",
      });
      await pc.setLocalDescription(offer);
      await sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
      await ringPeer();
    }
  }, [ensurePC, getConstraints, me?.id, mode, roleParam, sendSignal]);

  useEffect(() => {
    if (!authChecked || !me?.id) return;
    (async () => { await startOrPrep(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, me?.id]);

  // ---------- Controls ----------
  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOff((v) => !v);
  }, []);

  const endCall = useCallback(
    async (remote = false) => {
      setStatus("ended");

      if (!remote && me?.id) {
        await Promise.allSettled([
          sendSignal({ kind: "bye", from: me.id }),
          byePeer(),
        ]);
      }

      try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
      try { pcRef.current?.close(); } catch {}
      pcRef.current = null;
      try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      localStreamRef.current = null;

      router.push(endRoute(meRole));
    },
    [byePeer, me?.id, meRole, router, sendSignal]
  );

  // ---------- Accessibility: keyboard shortcuts ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") { e.preventDefault(); toggleMute(); }
      if (e.key.toLowerCase() === "v" && mode === "video") { e.preventDefault(); toggleCamera(); }
      if (e.key.toLowerCase() === "e") { e.preventDefault(); void endCall(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [endCall, mode, toggleCamera, toggleMute]);

  if (!authChecked) {
    return <div className="p-6">Joining the call…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Call • {mode}</h1>
          <p className="text-sm text-gray-500">
            You: <span className="font-mono">{me?.email || me?.id}</span> • Peer: {peerName}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Status: {status} • Role: {roleParam} • Account: {meRole}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">Hotkeys: <kbd>M</kbd> mute, <kbd>V</kbd> camera, <kbd>E</kbd> end</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Call controls">
          <Button variant="secondary" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Unmute microphone" : "Mute microphone"}>
            {muted ? "Unmute" : "Mute"}
          </Button>
          {mode === "video" && (
            <Button variant="secondary" onClick={toggleCamera} aria-pressed={camOff} aria-label={camOff ? "Turn camera on" : "Turn camera off"}>
              {camOff ? "Camera On" : "Camera Off"}
            </Button>
          )}
          <Button variant="destructive" onClick={() => void endCall(false)} aria-label="End call and return">
            End
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Tile videoRef={remoteVideoRef} label="Remote" />
        <Tile videoRef={localVideoRef} label="You" mirrored />
      </div>
    </div>
  );
}
