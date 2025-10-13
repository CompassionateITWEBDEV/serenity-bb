// ==========================================
// File: lib/webrtc/signaling.ts
// ==========================================
import { supabase } from "@/lib/supabase/client";

type SignalPayload =
  | { type: "webrtc-offer"; conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc-answer"; conversationId: string; fromId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc-ice"; conversationId: string; fromId: string; candidate: RTCIceCandidateInit }
  | { type: "hangup"; conversationId: string; fromId: string };

export function userRingChannel(userId: string) {
  // Why: single channel per user for call signals.
  return supabase.channel(`webrtc:${userId}`, {
    config: { broadcast: { self: false } }, // don't echo to sender
  });
}

export async function sendOfferToUser(toUserId: string, p: Extract<SignalPayload, { type: "webrtc-offer" }>) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-offer",
    payload: p,
  });
}
export async function sendAnswerToUser(toUserId: string, p: Extract<SignalPayload, { type: "webrtc-answer" }>) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-answer",
    payload: p,
  });
}
export async function sendIceToUser(toUserId: string, p: Extract<SignalPayload, { type: "webrtc-ice" }>) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "webrtc-ice",
    payload: p,
  });
}
export async function sendHangupToUser(toUserId: string, conversationId: string, fromId?: string) {
  await supabase.channel(`webrtc:${toUserId}`).send({
    type: "broadcast",
    event: "hangup",
    payload: { type: "hangup", conversationId, fromId: fromId ?? "system" },
  });
}

// ==========================================
// File: hooks/useWebRTCCall.ts
// ==========================================
import * as React from "react";
import {
  userRingChannel,
  sendOfferToUser,
  sendAnswerToUser,
  sendIceToUser,
  sendHangupToUser,
} from "@/lib/webrtc/signaling";

export type CallMode = "audio" | "video";
export type CallRole = "caller" | "callee";

export type UseCallParams = {
  open: boolean;
  conversationId: string;
  role: CallRole;
  mode: CallMode;
  meId: string;
  peerUserId: string;
  turn?: { urls: string[]; username?: string; credential?: string };
};

export type UseCallState = {
  status: "ringing" | "connecting" | "connected" | "ended" | "failed" | "missed";
  mediaError: string | null;
  dialSeconds: number;
  muted: boolean;
  camOff: boolean;
  netOffline: boolean;
  stunOk: boolean | null;
  turnOk: boolean | null;
  usingRelayOnly: boolean;
};

export function useWebRTCCall({
  open,
  conversationId,
  role,
  mode,
  meId,
  peerUserId,
  turn,
}: UseCallParams) {
  // ---------- State ----------
  const [state, setState] = React.useState<UseCallState>({
    status: role === "caller" ? "ringing" : "connecting",
    mediaError: null,
    dialSeconds: 0,
    muted: false,
    camOff: mode === "audio",
    netOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
    stunOk: null,
    turnOk: null,
    usingRelayOnly: false,
  });

  // ---------- Refs ----------
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);
  const chanRef = React.useRef<ReturnType<typeof userRingChannel> | null>(null);

  const answeredRef = React.useRef(false);
  const remoteDescSetRef = React.useRef(false);
  const pendingRemoteIce = React.useRef<RTCIceCandidateInit[]>([]);
  const closingRef = React.useRef(false);

  const lastOfferRef = React.useRef<RTCSessionDescriptionInit | null>(null);
  const lastAnswerRef = React.useRef<RTCSessionDescriptionInit | null>(null);

  const offerRetryRef = React.useRef<number | null>(null);
  const answerRetryRef = React.useRef<number | null>(null);
  const offerAttemptsRef = React.useRef(0);
  const answerAttemptsRef = React.useRef(0);

  const dialTimerRef = React.useRef<number | null>(null);
  const dialTickRef = React.useRef<number | null>(null);
  const connectWatchdogRef = React.useRef<number | null>(null);

  const offerHandledRef = React.useRef(false);
  const answerHandledRef = React.useRef(false);

  // ---------- Elements (set from outside) ----------
  const localVideoEl = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoEl = React.useRef<HTMLVideoElement | null>(null);
  const remoteAudioEl = React.useRef<HTMLAudioElement | null>(null);

  // ---------- Config ----------
  const RTC_BASE: RTCConfiguration = React.useMemo(
    () => ({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        ...(turn?.urls?.length
          ? [{ urls: turn.urls, username: turn.username, credential: turn.credential } as RTCIceServer]
          : []),
      ],
      bundlePolicy: "balanced",
      iceTransportPolicy: "all",
    }),
    [turn]
  );

  const ICE_GATHER_TIMEOUT_MS = 7000;
  const CONNECT_WATCHDOG_MS = 18000;
  const MAX_RESEND_ATTEMPTS = 20;
  const RESEND_MS = 1200;

  // ---------- Online/Offline ----------
  React.useEffect(() => {
    const onOnline = () => setState((s) => ({ ...s, netOffline: false }));
    const onOffline = () => setState((s) => ({ ...s, netOffline: true }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ---------- External controls ----------
  const setMuted = (v: boolean) => {
    const s = localStreamRef.current;
    s?.getAudioTracks().forEach((t) => (t.enabled = !v));
    setState((st) => ({ ...st, muted: v }));
  };
  const setCamOff = (v: boolean) => {
    const s = localStreamRef.current;
    s?.getVideoTracks().forEach((t) => (t.enabled = !v));
    setState((st) => ({ ...st, camOff: v }));
  };

  // ---------- Helpers ----------
  function forcePlay(el: HTMLMediaElement | null | undefined) {
    if (!el) return;
    const tryPlay = (n = 8) => {
      const p = el.play();
      (p as Promise<void>)?.catch?.(() => n > 0 && setTimeout(() => tryPlay(n - 1), 250));
    };
    tryPlay();
  }
  function attachVideo(el: HTMLVideoElement | null, stream: MediaStream | null, mirror: boolean) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.muted = mirror;
    el.playsInline = true;
    el.autoplay = true;
    el.style.transform = mirror ? "scaleX(-1)" : "none";
    forcePlay(el);
  }
  function attachAudio(el: HTMLAudioElement | null, stream: MediaStream | null) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.autoplay = true;
    el.controls = false;
    el.muted = false;
    forcePlay(el);
  }
  async function ensureMediaPreflight(m: CallMode) {
    if (typeof window === "undefined") throw new Error("Media not available.");
    if (!window.isSecureContext) throw new Error("Use HTTPS to access camera/mic.");
    const md = navigator.mediaDevices as any;
    if (!md?.getUserMedia || !md?.enumerateDevices) throw new Error("Media devices API unavailable.");
    let devices = await navigator.mediaDevices.enumerateDevices();
    if (!devices.some((d) => d.kind === "audioinput" || d.kind === "videoinput")) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: m === "video" });
        devices = await navigator.mediaDevices.enumerateDevices();
      } catch (e: any) {
        const n = e?.name || "";
        if (n === "NotAllowedError" || n === "SecurityError") throw new Error("Allow Camera and Microphone for this site.");
        if (n === "NotFoundError") throw new Error("Plug in or enable a microphone/camera.");
        throw new Error("Could not access microphone/camera.");
      }
    }
    const hasMic = devices.some((d) => d.kind === "audioinput");
    const hasCam = devices.some((d) => d.kind === "videoinput");
    if (!hasMic) throw new Error("No microphone found.");
    if (m === "video" && !hasCam) throw new Error("No camera found.");
  }
  function buildConstraints(m: CallMode, quality: "relaxed" | "strict" | "fallback"): MediaStreamConstraints {
    const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const videoRelaxed: MediaTrackConstraints = { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } };
    const videoStrict: MediaTrackConstraints = { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, frameRate: { ideal: 30, max: 60 } };
    return { audio, video: m === "video" ? (quality === "relaxed" ? videoRelaxed : quality === "strict" ? videoStrict : true) : false };
  }
  async function getUserStreamWithRetries(m: CallMode): Promise<MediaStream> {
    await ensureMediaPreflight(m);
    try {
      return await navigator.mediaDevices.getUserMedia(buildConstraints(m, "relaxed"));
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia(buildConstraints(m, "strict"));
      } catch (e2: any) {
        const n = e2?.name || "";
        if (n === "OverconstrainedError") {
          try {
            return await navigator.mediaDevices.getUserMedia(buildConstraints(m, "fallback"));
          } catch {
            throw new Error("Could not match camera settings.");
          }
        }
        if (n === "NotReadableError" || n === "AbortError") throw new Error("Camera or microphone is in use by another app.");
        if (n === "NotAllowedError" || n === "SecurityError") throw new Error("Allow Camera and Microphone for this site.");
        if (n === "NotFoundError") throw new Error("Requested device not found.");
        throw new Error("Could not access microphone/camera.");
      }
    }
  }
  async function probeSrflx(cfg: RTCConfiguration): Promise<boolean> {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({ ...cfg, iceTransportPolicy: "all" });
      let ok = false;
      pc.onicecandidate = (e) => {
        if (e.candidate && /typ srflx/.test(e.candidate.candidate)) ok = true;
        if (!e.candidate) {
          resolve(ok);
          pc.close();
        }
      };
      pc.createDataChannel("probe");
      pc.createOffer().then((o) => pc.setLocalDescription(o));
    });
  }
  async function probeRelay(cfg: RTCConfiguration): Promise<boolean> {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({ ...cfg, iceTransportPolicy: "relay" });
      let ok = false;
      pc.onicecandidate = (e) => {
        if (e.candidate && /typ relay/.test(e.candidate.candidate)) ok = true;
        if (!e.candidate) {
          resolve(ok);
          pc.close();
        }
      };
      pc.createDataChannel("probe");
      pc.createOffer().then((o) => pc.setLocalDescription(o));
    });
  }

  // ---------- Core lifecycle ----------
  React.useEffect(() => {
    if (!open) {
      stopAllTimers();
      teardownAll();
      return;
    }
    if (state.netOffline) {
      setState((s) => ({ ...s, mediaError: "You’re offline. Reconnect to the Internet.", status: "failed" }));
      return;
    }

    closingRef.current = false;
    answerHandledRef.current = false;
    offerHandledRef.current = false;
    remoteDescSetRef.current = false;
    pendingRemoteIce.current = [];
    setState((s) => ({ ...s, status: role === "caller" ? "ringing" : "connecting", mediaError: null }));

    const ch = userRingChannel(meId);
    chanRef.current = ch;

    // Handlers BEFORE subscribe
    ch.on("broadcast", { event: "webrtc-answer" }, async (msg) => {
      const p = (msg.payload || {}) as any;
      if (p.conversationId !== conversationId || p.fromId !== peerUserId) return;
      if (!pcRef.current || p?.sdp?.type !== "answer") return;
      if (answerHandledRef.current) return;
      answerHandledRef.current = true;
      try {
        await pcRef.current.setRemoteDescription(p.sdp);
        remoteDescSetRef.current = true;
        for (const c of pendingRemoteIce.current) {
          try {
            await pcRef.current.addIceCandidate(c);
          } catch {}
        }
        pendingRemoteIce.current = [];
        stopResendOffer();
      } catch {
        answerHandledRef.current = false;
      }
    });

    ch.on("broadcast", { event: "webrtc-offer" }, async (msg) => {
      if (!pcRef.current || role !== "callee") return;
      const p = (msg.payload || {}) as any;
      if (p.conversationId !== conversationId || p.fromId !== peerUserId) return;
      if (offerHandledRef.current) return;
      offerHandledRef.current = true;
      try {
        await pcRef.current.setRemoteDescription(p.sdp);
        remoteDescSetRef.current = true;

        for (const c of pendingRemoteIce.current) {
          try {
            await pcRef.current.addIceCandidate(c);
          } catch {}
        }
        pendingRemoteIce.current = [];

        const ans = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(ans);
        lastAnswerRef.current = ans;
        await sendAnswerToUser(peerUserId, { conversationId, fromId: meId, sdp: ans });
        setState((s) => ({ ...s, status: "connecting" }));
        startResendAnswer();
      } catch {
        offerHandledRef.current = false;
        failAndClose("failed");
      }
    });

    ch.on("broadcast", { event: "webrtc-ice" }, async (msg) => {
      const p = (msg.payload || {}) as any;
      if (p.conversationId !== conversationId || p.fromId !== peerUserId) return;
      if (!pcRef.current) return;
      if (!remoteDescSetRef.current) {
        pendingRemoteIce.current.push(p.candidate);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(p.candidate);
      } catch {}
    });

    ch.on("broadcast", { event: "hangup" }, () => endDueToRemote());

    // Subscribe and proceed
    let unsub = false;
    ch.subscribe(async (s) => {
      if (unsub || s !== "SUBSCRIBED") return;
      // Media
      const stream = await getUserStreamWithRetries(mode).catch(async (err) => {
        setState((st) => ({ ...st, mediaError: err?.message || "Media devices unavailable.", status: "failed" }));
        try {
          await sendHangupToUser(peerUserId, conversationId, meId);
        } catch {}
        return null;
      });
      if (!stream) return;
      localStreamRef.current = stream;

      // Attach local immediately (helps autoplay policies)
      // (UI will attach via setters below)
      // Build PC (maybe relay-only from probe results)
      const stun = await probeSrflx(RTC_BASE).catch(() => false);
      const turnAvail = turn?.urls?.length ? await probeRelay(RTC_BASE).catch(() => false) : false;
      setState((st) => ({ ...st, stunOk: stun, turnOk: turnAvail }));

      const relayOnly = !stun && !!turnAvail;
      const cfg: RTCConfiguration = { ...RTC_BASE, iceTransportPolicy: relayOnly ? "relay" : "all" };
      if (relayOnly) setState((st) => ({ ...st, usingRelayOnly: true }));

      const pc = new RTCPeerConnection(cfg);
      pcRef.current = pc;

      // Tracks
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.onicecandidate = async (e) => {
        if (!e.candidate) return;
        try {
          await sendIceToUser(peerUserId, { conversationId, fromId: meId, candidate: e.candidate.toJSON() });
        } catch {}
      };
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === "connected") {
          answeredRef.current = true;
          setState((s2) => ({ ...s2, status: "connected" }));
          stopDialTimer();
          stopConnectWatchdog();
          stopResendOffer();
          stopResendAnswer();
        } else if (st === "failed" || st === "closed") {
          endDueToRemote();
        }
      };

      // ICE gather timeout + connect watchdog
      startIceGatherTimeout(pc, async () => {
        if (!relayOnly && turnAvail) {
          await switchToRelayOnlyAndRenegotiate();
        }
      });
      startConnectWatchdog(async () => {
        if (!relayOnly && turnAvail) {
          await switchToRelayOnlyAndRenegotiate();
        } else {
          // give up politely
          failAndClose("failed");
        }
      });

      // Caller/Callee
      if (role === "caller") {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        await pc.setLocalDescription(offer);
        lastOfferRef.current = offer;
        await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: offer });
        startDialTimer();
        startResendOffer();
      } else {
        startDialTimer();
      }
    });

    return () => {
      unsub = true;
      stopAllTimers();
      teardownAll();
    };

    // --- inner helpers ---
    function startDialTimer() {
      stopDialTimer();
      setState((s) => ({ ...s, dialSeconds: 0 }));
      dialTickRef.current = window.setInterval(
        () => setState((s) => ({ ...s, dialSeconds: s.dialSeconds + 1 })),
        1000
      ) as unknown as number;
      dialTimerRef.current = window.setTimeout(async () => {
        if (!answeredRef.current) {
          setState((s) => ({ ...s, status: "missed" }));
          try {
            await sendHangupToUser(peerUserId, conversationId, meId);
          } catch {}
          failAndClose("missed");
        }
      }, 5 * 60 * 1000) as unknown as number;
    }
    function stopDialTimer() {
      if (dialTimerRef.current) clearTimeout(dialTimerRef.current);
      if (dialTickRef.current) clearInterval(dialTickRef.current);
      dialTimerRef.current = dialTickRef.current = null;
    }
    function startConnectWatchdog(onTimeout: () => void) {
      stopConnectWatchdog();
      connectWatchdogRef.current = window.setTimeout(onTimeout, CONNECT_WATCHDOG_MS) as unknown as number;
    }
    function stopConnectWatchdog() {
      if (connectWatchdogRef.current) clearTimeout(connectWatchdogRef.current);
      connectWatchdogRef.current = null;
    }
    function stopAllTimers() {
      stopDialTimer();
      stopConnectWatchdog();
      stopResendOffer();
      stopResendAnswer();
    }
    async function switchToRelayOnlyAndRenegotiate() {
      const pcOld = pcRef.current;
      const stream = localStreamRef.current;
      if (!pcOld || !stream) return;

      const pc = new RTCPeerConnection({ ...RTC_BASE, iceTransportPolicy: "relay" });
      setState((s) => ({ ...s, usingRelayOnly: true }));
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = async (e) => e.candidate && sendIceToUser(peerUserId, { conversationId, fromId: meId, candidate: e.candidate.toJSON() });
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          answeredRef.current = true;
          setState((s2) => ({ ...s2, status: "connected" }));
          stopAllTimers();
        }
      };

      remoteDescSetRef.current = false;
      pendingRemoteIce.current = [];

      if (role === "caller") {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        await pc.setLocalDescription(offer);
        lastOfferRef.current = offer;
        await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: offer });
        startResendOffer();
      } else {
        setState((s) => ({ ...s, status: "connecting" }));
      }

      try {
        pcOld.close();
      } catch {}
    }
    function startIceGatherTimeout(pc: RTCPeerConnection, onTimeout: () => void) {
      const tid = window.setTimeout(() => {
        if (pc.iceConnectionState === "new" || pc.iceConnectionState === "checking") onTimeout();
      }, ICE_GATHER_TIMEOUT_MS);
      pc.addEventListener("connectionstatechange", () => {
        const s = pc.connectionState;
        if (s === "connected" || s === "failed" || s === "closed") clearTimeout(tid);
      });
    }
    function stopResendOffer() {
      if (offerRetryRef.current) {
        clearInterval(offerRetryRef.current);
        offerRetryRef.current = null;
      }
    }
    function stopResendAnswer() {
      if (answerRetryRef.current) {
        clearInterval(answerRetryRef.current);
        answerRetryRef.current = null;
      }
    }
    function startResendOffer() {
      stopResendOffer();
      offerAttemptsRef.current = 0;
      offerRetryRef.current = window.setInterval(async () => {
        if (remoteDescSetRef.current || offerAttemptsRef.current >= MAX_RESEND_ATTEMPTS || state.status === "connected") {
          stopResendOffer();
          return;
        }
        offerAttemptsRef.current += 1;
        const o = lastOfferRef.current;
        if (o) await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: o });
      }, RESEND_MS) as unknown as number;
    }
    function startResendAnswer() {
      stopResendAnswer();
      answerAttemptsRef.current = 0;
      answerRetryRef.current = window.setInterval(async () => {
        if (state.status === "connected" || answerAttemptsRef.current >= MAX_RESEND_ATTEMPTS) {
          stopResendAnswer();
          return;
        }
        answerAttemptsRef.current += 1;
        const a = lastAnswerRef.current;
        if (a) await sendAnswerToUser(peerUserId, { conversationId, fromId: meId, sdp: a });
      }, RESEND_MS) as unknown as number;
    }
    function endDueToRemote() {
      try {
        sendHangupToUser(peerUserId, conversationId, meId);
      } catch {}
      failAndClose("ended");
    }
    function failAndClose(final: UseCallState["status"]) {
      if (closingRef.current) return;
      closingRef.current = true;
      setState((s) => ({ ...s, status: final }));
      teardownAll();
    }
    function teardownAll() {
      try {
        pcRef.current?.getSenders().forEach((s) => s.track && s.track.stop());
        pcRef.current?.getReceivers().forEach((r) => r.track && r.track.stop());
        pcRef.current?.close();
      } catch {}
      pcRef.current = null;
      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      try {
        remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      localStreamRef.current = null;
      remoteStreamRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationId, role, mode, meId, peerUserId, RTC_BASE]);

  // ---------- API to component ----------
  return {
    state,
    // attach elements (CallDialog passes refs)
    setLocalVideoRef: (el: HTMLVideoElement | null) => {
      localVideoEl.current = el;
      if (el && localStreamRef.current) attachVideo(el, localStreamRef.current, true);
    },
    setRemoteVideoRef: (el: HTMLVideoElement | null) => {
      remoteVideoEl.current = el;
      if (el && remoteStreamRef.current) attachVideo(el, remoteStreamRef.current, false);
    },
    setRemoteAudioRef: (el: HTMLAudioElement | null) => {
      remoteAudioEl.current = el;
      if (el && remoteStreamRef.current) attachAudio(el, remoteStreamRef.current);
    },
    setMuted,
    setCamOff,
    hangup: async () => {
      try {
        await sendHangupToUser(peerUserId, conversationId, meId);
      } catch {}
      // teardown handled in effect cleanup
    },
  };
}

// ==========================================
// File: components/CallDialog.tsx
// ==========================================
"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { useWebRTCCall, CallMode, CallRole } from "@/hooks/useWebRTCCall";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  role: CallRole;
  mode: CallMode;
  meId: string;
  peerUserId: string;
  peerName?: string;
  turn?: { urls: string[]; username?: string; credential?: string };
};

export default function CallDialog({
  open, onOpenChange, conversationId, role, mode, meId, peerUserId, peerName, turn,
}: Props) {
  const {
    state,
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
    setMuted,
    setCamOff,
    hangup,
  } = useWebRTCCall({ open, conversationId, role, mode, meId, peerUserId, turn });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => v ? onOpenChange(true) : (hangup().catch(() => {}), onOpenChange(false))}
    >
      <DialogContent className="max-w-3xl overflow-hidden" aria-describedby="call-desc">
        <DialogHeader>
          <DialogTitle>
            {mode === "video" ? "Video Call" : "Audio Call"} • {peerName || "Contact"}
            {state.status === "ringing" && <span className="ml-2 text-xs text-gray-500">Dialing… {formatTime(state.dialSeconds)}</span>}
            {state.status === "connecting" && <span className="ml-2 text-xs text-gray-500">Connecting…</span>}
            {state.status === "connected" && <span className="ml-2 text-xs text-green-600">Connected</span>}
            {state.status === "ended" && <span className="ml-2 text-xs text-gray-500">Call ended</span>}
          </DialogTitle>
          <DialogDescription id="call-desc" className="sr-only">
            Real-time {mode} call with {peerName || "contact"}.
          </DialogDescription>
        </DialogHeader>

        {/* Connectivity banner */}
        <div className="mb-2 rounded-md border p-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span>Network: {state.netOffline ? <b className="text-red-600">Offline</b> : <b className="text-green-600">Online</b>}</span>
            <span>STUN: {state.stunOk === null ? "…" : state.stunOk ? "OK" : "Blocked"}</span>
            <span>TURN: {state.turnOk === null ? "…" : state.turnOk ? "OK" : "Unknown/None"}</span>
            {state.usingRelayOnly && <span className="rounded bg-gray-100 px-2 py-0.5">Relay-only</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Remote */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={setRemoteVideoRef as any} className="h-full w-full object-cover" />
            <audio ref={setRemoteAudioRef as any} className="hidden" />
            {state.status !== "connected" && state.status !== "ended" && !state.mediaError && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                {state.status === "ringing" ? "Ringing…" : state.status === "connecting" ? "Connecting…" : "Waiting…"}
              </div>
            )}
            {state.status === "ended" && <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Call ended</div>}
            {state.mediaError && (
              <div className="absolute inset-0 grid place-items-center p-3 text-center text-sm text-white">
                <div className="rounded-lg bg-black/60 p-3">
                  <p className="mb-2">{state.mediaError}</p>
                  <div className="flex justify-center">
                    <Button size="sm" onClick={() => onOpenChange(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Local */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={setLocalVideoRef as any} className="h-full w-full object-cover" />
            {state.camOff && <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Camera off</div>}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          {state.status !== "ended" ? (
            <>
              <Button
                variant={state.muted ? "secondary" : "default"}
                onClick={() => setMuted(!state.muted)}
                className="rounded-full"
                title={state.muted ? "Unmute" : "Mute"}
              >
                {state.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              {mode === "video" && (
                <Button
                  variant={state.camOff ? "secondary" : "default"}
                  onClick={() => setCamOff(!state.camOff)}
                  className="rounded-full"
                  title={state.camOff ? "Turn camera on" : "Turn camera off"}
                >
                  {state.camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              )}

              <Button variant="destructive" onClick={() => (hangup(), onOpenChange(false))} className="rounded-full" title="End call">
                <PhoneOff className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" disabled className="rounded-full" title="Call ended">
                Call ended
              </Button>
              <Button onClick={() => onOpenChange(false)} className="rounded-full" title="Close">
                Close
              </Button>
            </>
          )}
        </div>

        {state.status === "missed" && <p className="mt-2 text-center text-sm text-gray-500">No answer. Call timed out after 5 minutes.</p>}
      </DialogContent>
    </Dialog>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
