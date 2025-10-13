"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import {
  userRingChannel, sendOfferToUser, sendAnswerToUser, sendIceToUser, sendHangupToUser,
} from "@/lib/webrtc/signaling";
import { supabase } from "@/lib/supabase/client";

export type CallMode = "audio" | "video";
export type CallRole = "caller" | "callee";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  role: CallRole;
  mode: CallMode;
  meId: string;
  meName: string;
  peerUserId: string;
  peerName?: string;
  peerAvatar?: string;
};

/* ---------- TURN config ---------- */
const turnUrls = (process.env.NEXT_PUBLIC_TURN_URL || "")
  .split(",").map((u) => u.trim()).filter(Boolean);

const BASE_RTC: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    ...(turnUrls.length
      ? [{ urls: turnUrls, username: process.env.NEXT_PUBLIC_TURN_USERNAME, credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL } as RTCIceServer]
      : []),
  ],
  bundlePolicy: "balanced",
  // Start with "all"; we may switch to "relay" if needed.
  iceTransportPolicy: "all",
};

/* ---------- Single-call guard ---------- */
declare global { interface Window { __callActive?: boolean; } }
const setCallActive = (v: boolean) => { try { window.__callActive = v; } catch {} };
const callActive = () => { try { return !!window.__callActive; } catch { return false; } };

/* ---------- Component ---------- */
export default function CallDialog({
  open, onOpenChange, conversationId, role, mode, meId, meName, peerUserId, peerName,
}: Props) {
  const [status, setStatus] = React.useState<"ringing"|"connecting"|"connected"|"ended"|"failed"|"missed">(
    role === "caller" ? "ringing" : "connecting"
  );
  const [muted, setMuted] = React.useState(false);
  const [camOff, setCamOff] = React.useState(mode === "audio");
  const [dialSeconds, setDialSeconds] = React.useState(0);

  const [mediaError, setMediaError] = React.useState<string | null>(null);
  const [netOffline, setNetOffline] = React.useState<boolean>(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [retryNonce, setRetryNonce] = React.useState(0);

  // Connectivity probes
  const [stunOk, setStunOk] = React.useState<boolean | null>(null);
  const [turnOk, setTurnOk] = React.useState<boolean | null>(null);
  const [usingRelayOnly, setUsingRelayOnly] = React.useState(false);

  // Core refs
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);

  // Signaling
  const chanRef = React.useRef<ReturnType<typeof userRingChannel> | null>(null);

  // Timers/guards
  const dialTimerRef = React.useRef<number | null>(null);
  const dialTickRef = React.useRef<number | null>(null);
  const connectWatchdogRef = React.useRef<number | null>(null);
  const answeredRef = React.useRef(false);
  const closingRef = React.useRef(false);

  // ICE race/queue
  const remoteDescSetRef = React.useRef(false);
  const pendingRemoteIce = React.useRef<RTCIceCandidateInit[]>([]);

  // SDP resend loops
  const lastOfferRef = React.useRef<RTCSessionDescriptionInit | null>(null);
  const lastAnswerRef = React.useRef<RTCSessionDescriptionInit | null>(null);
  const offerRetryRef = React.useRef<number | null>(null);
  const answerRetryRef = React.useRef<number | null>(null);
  const offerAttemptsRef = React.useRef(0);
  const answerAttemptsRef = React.useRef(0);
  const MAX_RESEND_ATTEMPTS = 20;
  const RESEND_MS = 1200;

  // Duplicate SDP guards
  const offerHandledRef = React.useRef(false);
  const answerHandledRef = React.useRef(false);

  // ICE gathering timeout
  const ICE_GATHER_TIMEOUT_MS = 7000;

  // Watchdog to force TURN-only if stuck
  const CONNECT_WATCHDOG_MS = 18000;

  /* ---------- Online/Offline ---------- */
  React.useEffect(() => {
    const onOnline = () => setNetOffline(false);
    const onOffline = () => setNetOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  /* ---------- Apply controls to tracks ---------- */
  React.useEffect(() => {
    const s = localStreamRef.current; if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted]);
  React.useEffect(() => {
    const s = localStreamRef.current; if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !camOff));
  }, [camOff]);

  /* ---------- Lifecycle ---------- */
  React.useEffect(() => {
    if (!open) { setCallActive(false); stopDialTimer(); stopConnectWatchdog(); return; }

    if (callActive()) {
      setMediaError("A call is already active or starting.");
      setStatus("failed");
      return;
    }
    if (netOffline) {
      setMediaError("You’re offline. Reconnect to the Internet to start a call.");
      setStatus("failed");
      return;
    }

    setCallActive(true);
    setMediaError(null);
    closingRef.current = false;
    offerHandledRef.current = false;
    answerHandledRef.current = false;
    remoteDescSetRef.current = false;
    pendingRemoteIce.current = [];
    setStunOk(null);
    setTurnOk(null);
    setUsingRelayOnly(false);

    const beforeUnload = () => { try { sendHangupToUser(peerUserId, conversationId); } catch {} };
    window.addEventListener("beforeunload", beforeUnload);

    (async () => {
      console.log(`[CallDialog] start role=${role} mode=${mode}`);
      setStatus(role === "caller" ? "ringing" : "connecting");

      // 0) Create signaling channel, attach handlers, SUBSCRIBE
      const ch = userRingChannel(meId);
      chanRef.current = ch;
      setupSignalingHandlers(ch);
      await ensureSubscribed(ch);
      console.log("[CallDialog] signaling subscribed");

      // 1) Device/media
      const stream = await getUserStreamWithRetries(mode).catch(async (err) => {
        setMediaError(err?.message || "Media devices unavailable.");
        setStatus("failed");
        try { await sendHangupToUser(peerUserId, conversationId); } catch {}
        throw err;
      });
      localStreamRef.current = stream;
      attachVideo(localRef.current, stream, true);

      // 2) Connectivity probes (non-blocking but awaited before offer/answer)
      const { stun, turn } = await probeConnectivity(BASE_RTC, !!turnUrls.length);
      setStunOk(stun);
      setTurnOk(turn);

      // 3) Create PC (all or relay-only depending on probe)
      const initialRelayOnly = !stun && turn; // bad NAT but TURN OK → go relay-only now
      const pc = createPeerConnection(initialRelayOnly ? { ...BASE_RTC, iceTransportPolicy: "relay" } : BASE_RTC);
      setUsingRelayOnly(initialRelayOnly);
      pcRef.current = pc;

      // add tracks
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // remote stream & handlers
      const remote = new MediaStream();
      remoteStreamRef.current = remote;
      attachVideo(remoteRef.current, remote, false);
      attachAudio(remoteAudioRef.current, remote);

      pc.addEventListener("track", (e) => {
        remote.addTrack(e.track);
        forcePlay(remoteRef.current);
        forcePlay(remoteAudioRef.current);
      });

      // trickle ICE to peer
      pc.onicecandidate = async (e) => {
        if (!e.candidate) return; // end of gathering
        try {
          await sendIceToUser(peerUserId, { conversationId, fromId: meId, candidate: e.candidate.toJSON() });
        } catch {}
      };

      // connection state
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        console.log("[CallDialog] connectionState:", s);
        if (s === "connected") {
          answeredRef.current = true;
          setStatus("connected");
          stopDialTimer(); stopConnectWatchdog();
          stopResendOffer(); stopResendAnswer();
          forcePlay(localRef.current); forcePlay(remoteRef.current); forcePlay(remoteAudioRef.current);
        } else if (s === "failed" || s === "closed") {
          endDueToRemote();
        }
      };
      pc.oniceconnectionstatechange = () => {
        console.log("[CallDialog] iceConnectionState:", pc.iceConnectionState);
      };

      // 4) ICE gather timeout & connect watchdog
      startIceGatherTimeout(pc, async () => {
        console.warn("[CallDialog] ICE gather timeout hit");
        if (!usingRelayOnly && turn) {
          console.log("[CallDialog] switching to TURN-only (relay)");
          await switchToRelayOnlyAndRenegotiate();
        }
      });
      startConnectWatchdog(async () => {
        console.warn("[CallDialog] connect watchdog hit");
        if (!usingRelayOnly && turn) {
          await switchToRelayOnlyAndRenegotiate();
        }
      });

      // 5) Caller/callee flow
      if (role === "caller") {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        await pc.setLocalDescription(offer);
        lastOfferRef.current = offer;
        await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: offer });
        startDialTimer(); startResendOffer();
      } else {
        startDialTimer();
      }
    })().catch((e) => console.error("[CallDialog] setup error", e));

    async function switchToRelayOnlyAndRenegotiate() {
      setUsingRelayOnly(true);
      const old = pcRef.current;
      if (!old) return;
      // Tear down and rebuild in relay-only, then re-offer/answer
      const local = localStreamRef.current;
      const wasCaller = role === "caller";
      teardownPeerOnly();
      const relayCfg = { ...BASE_RTC, iceTransportPolicy: "relay" as const };
      const pc = createPeerConnection(relayCfg);
      pcRef.current = pc;
      local?.getTracks().forEach((t) => pc.addTrack(t, local));
      const remote = new MediaStream();
      remoteStreamRef.current = remote;
      attachVideo(remoteRef.current, remote, false);
      attachAudio(remoteAudioRef.current, remote);
      pc.addEventListener("track", (e) => { remote.addTrack(e.track); forcePlay(remoteRef.current); forcePlay(remoteAudioRef.current); });
      pc.onicecandidate = async (e) => { if (!e.candidate) return; try { await sendIceToUser(peerUserId, { conversationId, fromId: meId, candidate: e.candidate.toJSON() }); } catch {} };
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        console.log("[CallDialog] (relay) connectionState:", s);
        if (s === "connected") {
          answeredRef.current = true; setStatus("connected");
          stopDialTimer(); stopConnectWatchdog();
          stopResendOffer(); stopResendAnswer();
        } else if (s === "failed" || s === "closed") endDueToRemote();
      };
      pc.oniceconnectionstatechange = () => console.log("[CallDialog] (relay) iceState:", pc.iceConnectionState);

      remoteDescSetRef.current = false; pendingRemoteIce.current = [];
      if (wasCaller) {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        await pc.setLocalDescription(offer); lastOfferRef.current = offer;
        await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: offer });
        startResendOffer();
      } else {
        setStatus("connecting");
      }
    }

    function createPeerConnection(cfg: RTCConfiguration) {
      const pc = new RTCPeerConnection(cfg);
      return pc;
    }

    function setupSignalingHandlers(ch: ReturnType<typeof userRingChannel>) {
      // Answer → caller
      ch.on("broadcast", { event: "webrtc-answer" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId || p.fromId !== peerUserId) return;
        if (!pcRef.current || p?.sdp?.type !== "answer") return;
        if (answerHandledRef.current) return;
        answerHandledRef.current = true;
        try {
          await pcRef.current.setRemoteDescription(p.sdp);
          remoteDescSetRef.current = true;
          for (const c of pendingRemoteIce.current) { try { await pcRef.current.addIceCandidate(c); } catch {} }
          pendingRemoteIce.current = [];
          stopResendOffer();
        } catch (e) { answerHandledRef.current = false; }
      });

      // Offer → callee
      ch.on("broadcast", { event: "webrtc-offer" }, async (msg) => {
        if (!pcRef.current || role !== "callee") return;
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId || p.fromId !== peerUserId) return;
        if (offerHandledRef.current) return;
        offerHandledRef.current = true;
        try {
          await pcRef.current.setRemoteDescription(p.sdp);
          remoteDescSetRef.current = true;
          for (const c of pendingRemoteIce.current) { try { await pcRef.current.addIceCandidate(c); } catch {} }
          pendingRemoteIce.current = [];
          const ans = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(ans);
          lastAnswerRef.current = ans;
          await sendAnswerToUser(peerUserId, { conversationId, fromId: meId, sdp: ans });
          setStatus("connecting");
          startResendAnswer();
        } catch (e) { offerHandledRef.current = false; cleanupAndClose("failed"); }
      });

      // ICE candidates both ways
      ch.on("broadcast", { event: "webrtc-ice" }, async (msg) => {
        const p = (msg.payload || {}) as any;
        if (p.conversationId !== conversationId || p.fromId !== peerUserId) return;
        if (!pcRef.current) return;
        if (!remoteDescSetRef.current) { pendingRemoteIce.current.push(p.candidate); return; }
        try { await pcRef.current.addIceCandidate(p.candidate); } catch {}
      });

      // Hangup
      ch.on("broadcast", { event: "hangup" }, () => endDueToRemote());
    }

    function teardownPeerOnly() {
      try { pcRef.current?.getSenders().forEach((s) => s.track && s.track.stop()); } catch {}
      try { pcRef.current?.getReceivers().forEach((r) => r.track && r.track.stop()); } catch {}
      try { pcRef.current?.close(); } catch {}
      pcRef.current = null;
    }

    function startIceGatherTimeout(pc: RTCPeerConnection, onTimeout: () => void) {
      const start = Date.now();
      const tid = window.setTimeout(() => {
        // If we never saw a candidate and not connected → timeout
        if (pc.iceConnectionState === "new" || pc.iceConnectionState === "checking") onTimeout();
      }, ICE_GATHER_TIMEOUT_MS);
      // Clear when connected/failed
      const clearIfDone = () => {
        const s = pc.connectionState;
        if (s === "connected" || s === "failed" || s === "closed") clearTimeout(tid);
      };
      pc.addEventListener("connectionstatechange", clearIfDone);
    }

    function startConnectWatchdog(onTimeout: () => void) {
      stopConnectWatchdog();
      connectWatchdogRef.current = window.setTimeout(onTimeout, CONNECT_WATCHDOG_MS) as unknown as number;
    }
    function stopConnectWatchdog() {
      if (connectWatchdogRef.current) { clearTimeout(connectWatchdogRef.current); connectWatchdogRef.current = null; }
    }

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      stopResendOffer(); stopResendAnswer();
      teardownSignalingAndPc();
      stopConnectWatchdog();
      setCallActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, retryNonce, netOffline]);

  /* ---------- Resend loops ---------- */
  function startResendOffer() {
    stopResendOffer(); offerAttemptsRef.current = 0;
    offerRetryRef.current = window.setInterval(async () => {
      if (remoteDescSetRef.current || offerAttemptsRef.current >= MAX_RESEND_ATTEMPTS || status === "connected") {
        stopResendOffer(); return;
      }
      offerAttemptsRef.current += 1;
      if (lastOfferRef.current) {
        try { await sendOfferToUser(peerUserId, { conversationId, fromId: meId, sdp: lastOfferRef.current }); } catch {}
      }
    }, RESEND_MS) as unknown as number;
  }
  function stopResendOffer() { if (offerRetryRef.current) { clearInterval(offerRetryRef.current); offerRetryRef.current = null; } }

  function startResendAnswer() {
    stopResendAnswer(); answerAttemptsRef.current = 0;
    answerRetryRef.current = window.setInterval(async () => {
      if (status === "connected" || answerAttemptsRef.current >= MAX_RESEND_ATTEMPTS) { stopResendAnswer(); return; }
      answerAttemptsRef.current += 1;
      if (lastAnswerRef.current) {
        try { await sendAnswerToUser(peerUserId, { conversationId, fromId: meId, sdp: lastAnswerRef.current }); } catch {}
      }
    }, RESEND_MS) as unknown as number;
  }
  function stopResendAnswer() { if (answerRetryRef.current) { clearInterval(answerRetryRef.current); answerRetryRef.current = null; } }

  /* ---------- Dial timers ---------- */
  function startDialTimer() {
    stopDialTimer(); setDialSeconds(0);
    dialTickRef.current = window.setInterval(() => setDialSeconds((v) => v + 1), 1000) as unknown as number;
    dialTimerRef.current = window.setTimeout(async () => {
      if (!answeredRef.current) {
        setStatus("missed");
        try { await sendHangupToUser(peerUserId, conversationId); } catch {}
        cleanupAndClose("missed");
      }
    }, 5 * 60 * 1000) as unknown as number;
  }
  function stopDialTimer() {
    if (dialTimerRef.current) { clearTimeout(dialTimerRef.current); dialTimerRef.current = null; }
    if (dialTickRef.current) { clearInterval(dialTickRef.current); dialTickRef.current = null; }
  }

  /* ---------- UI actions ---------- */
  async function onHangupClick() {
    try { await sendHangupToUser(peerUserId, conversationId); } catch {}
    cleanupAndClose("ended");
  }
  async function onRestartIce() {
    const pc = pcRef.current; if (!pc) return;
    try { if ("restartIce" in pc) (pc as any).restartIce(); } catch {}
  }
  async function onForceRelay() {
    setRetryNonce((n) => n + 1); // teardown & re-init with relay-only via probes/flags
  }

  /* ---------- Media helpers ---------- */
  function forcePlay(el: HTMLMediaElement | null | undefined) {
    if (!el) return;
    const tryPlay = (n = 8) => {
      const p = el.play();
      if (p && typeof (p as any).catch === "function") {
        (p as Promise<void>).catch(() => { if (n > 0) setTimeout(() => tryPlay(n - 1), 250); });
      }
    };
    tryPlay();
  }
  function attachVideo(el: HTMLVideoElement | null, stream: MediaStream | null, mirror: boolean) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.muted = mirror; el.playsInline = true; el.autoplay = true;
    el.style.transform = mirror ? "scaleX(-1)" : "none";
    forcePlay(el);
  }
  function attachAudio(el: HTMLAudioElement | null, stream: MediaStream | null) {
    if (!el) return;
    (el as any).srcObject = stream || null;
    el.autoplay = true; el.controls = false; el.muted = false;
    forcePlay(el);
  }

  /* ---------- Media (robust) ---------- */
  type MediaPreflight = { audioId?: string; videoId?: string; hasMic: boolean; hasCam: boolean };
  async function ensureMediaPreflight(m: CallMode): Promise<MediaPreflight> {
    if (typeof window === "undefined") throw new Error("Media not available.");
    if (!window.isSecureContext) throw new Error("Use HTTPS to access camera/mic.");
    const md = navigator.mediaDevices as any;
    if (!md?.getUserMedia || !md?.enumerateDevices) throw new Error("Media devices API unavailable.");
    let devices = await navigator.mediaDevices.enumerateDevices();
    if (!devices.some(d => d.kind === "audioinput" || d.kind === "videoinput")) {
      try { await navigator.mediaDevices.getUserMedia({ audio: true, video: m === "video" }); devices = await navigator.mediaDevices.enumerateDevices(); }
      catch (e: any) {
        const n = e?.name || "";
        if (n === "NotAllowedError" || n === "SecurityError") throw new Error("Allow Camera and Microphone for this site.");
        if (n === "NotFoundError") throw new Error("Plug in or enable a microphone/camera.");
        throw new Error("Could not access microphone/camera.");
      }
    }
    const audioInputs = devices.filter(d=>d.kind==="audioinput");
    const videoInputs = devices.filter(d=>d.kind==="videoinput");
    if (!audioInputs.length) throw new Error("No microphone found.");
    if (m === "video" && !videoInputs.length) throw new Error("No camera found.");
    return { audioId: audioInputs[0]?.deviceId, videoId: videoInputs[0]?.deviceId, hasMic: !!audioInputs.length, hasCam: !!videoInputs.length };
  }
  function buildConstraints(
    m: CallMode, ids: { audioId?: string; videoId?: string }, quality: "relaxed" | "strict" | "fallback"
  ): MediaStreamConstraints {
    const audio: MediaTrackConstraints = {
      echoCancellation: true, noiseSuppression: true, autoGainControl: true,
      ...(ids.audioId && quality !== "fallback" ? { deviceId: { ideal: ids.audioId } } : {}),
    };
    const videoRelaxed: MediaTrackConstraints = {
      width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 },
      ...(ids.videoId ? { deviceId: { ideal: ids.videoId } } : {}),
    };
    const videoStrict: MediaTrackConstraints = {
      width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, frameRate: { ideal: 30, max: 60 },
      ...(ids.videoId ? { deviceId: { exact: ids.videoId } } : {}),
    };
    return { audio, video: m === "video" ? (quality === "relaxed" ? videoRelaxed : quality === "strict" ? videoStrict : true) : false };
  }
  async function getUserStreamWithRetries(m: CallMode): Promise<MediaStream> {
    const pre = await ensureMediaPreflight(m);
    try { return await navigator.mediaDevices.getUserMedia(buildConstraints(m, pre, "relaxed")); }
    catch (e1: any) {
      try { return await navigator.mediaDevices.getUserMedia(buildConstraints(m, pre, "strict")); }
      catch (e2: any) {
        const n = e2?.name || "";
        if (n === "OverconstrainedError") {
          try { return await navigator.mediaDevices.getUserMedia(buildConstraints(m, pre, "fallback")); }
          catch { throw new Error("Could not match camera settings."); }
        }
        if (n === "NotReadableError" || n === "AbortError") throw new Error("Camera or mic is in use by another app.");
        if (n === "NotAllowedError" || n === "SecurityError") throw new Error("Allow Camera and Microphone for this site.");
        if (n === "NotFoundError") throw new Error("Requested device not found.");
        throw new Error("Could not access microphone/camera.");
      }
    }
  }

  /* ---------- Connectivity probes ---------- */
  async function probeConnectivity(baseCfg: RTCConfiguration, hasTurn: boolean) {
    const stun = await probeSrflx(baseCfg).catch(() => false);
    let turn = false;
    if (hasTurn) turn = await probeRelay(baseCfg).catch(() => false);
    console.log("[CallDialog] probe → STUN:", stun, " TURN:", turn);
    return { stun: !!stun, turn: !!turn };
  }
  async function probeSrflx(cfg: RTCConfiguration): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const pc = new RTCPeerConnection({ ...cfg, iceTransportPolicy: "all" });
      let gotSrflx = false;
      pc.onicecandidate = (e) => {
        if (e.candidate && /typ srflx/.test(e.candidate.candidate)) gotSrflx = true;
        if (!e.candidate) { resolve(gotSrflx); pc.close(); }
      };
      pc.createDataChannel("probe");
      pc.createOffer().then((o) => pc.setLocalDescription(o));
    });
  }
  async function probeRelay(cfg: RTCConfiguration): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const pc = new RTCPeerConnection({ ...cfg, iceTransportPolicy: "relay" });
      let gotRelay = false;
      pc.onicecandidate = (e) => {
        if (e.candidate && /typ relay/.test(e.candidate.candidate)) gotRelay = true;
        if (!e.candidate) { resolve(gotRelay); pc.close(); }
      };
      pc.createDataChannel("probe");
      pc.createOffer().then((o) => pc.setLocalDescription(o));
    });
  }

  /* ---------- Cleanup ---------- */
  function teardownSignalingAndPc() {
    try { if (chanRef.current) supabase.removeChannel(chanRef.current); } catch {}
    chanRef.current = null;
    try { pcRef.current?.getSenders().forEach((s) => s.track && s.track.stop()); } catch {}
    try { pcRef.current?.getReceivers().forEach((r) => r.track && r.track.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { remoteStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    localStreamRef.current = null; remoteStreamRef.current = null;
    stopDialTimer(); stopConnectWatchdog();
    remoteDescSetRef.current = false; pendingRemoteIce.current = [];
    answeredRef.current = false; closingRef.current = false;
    lastOfferRef.current = null; lastAnswerRef.current = null;
  }
  function cleanupAndClose(finalStatus: "ended" | "failed" | "missed") {
    if (closingRef.current) return;
    closingRef.current = true; setStatus(finalStatus);
    teardownSignalingAndPc(); setCallActive(false);
    if (finalStatus !== "ended") onOpenChange(false);
    else closingRef.current = false;
  }
  function endDueToRemote() {
    try { sendHangupToUser(peerUserId, conversationId); } catch {}
    cleanupAndClose("ended");
  }
  async function ensureSubscribed(channel: ReturnType<typeof userRingChannel>) {
    return new Promise<void>((resolve) => {
      let done = false;
      channel.subscribe((s: string) => { if (!done && s === "SUBSCRIBED") { done = true; resolve(); } });
    });
  }

  /* ---------- UI ---------- */
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => v ? onOpenChange(true) : (sendHangupToUser(peerUserId, conversationId), cleanupAndClose("ended"))}
    >
      <DialogContent className="max-w-3xl overflow-hidden" aria-describedby="call-desc">
        <DialogHeader>
          <DialogTitle>
            {mode === "video" ? "Video Call" : "Audio Call"} • {peerName || "Contact"}
            {status === "ringing" && <span className="ml-2 text-xs text-gray-500">Dialing… {formatTime(dialSeconds)}</span>}
            {status === "connecting" && <span className="ml-2 text-xs text-gray-500">Connecting…</span>}
            {status === "connected" && <span className="ml-2 text-xs text-green-600">Connected</span>}
            {status === "ended" && <span className="ml-2 text-xs text-gray-500">Call ended</span>}
          </DialogTitle>
          <DialogDescription id="call-desc" className="sr-only">
            Real-time {mode} call with {peerName || "contact"}.
          </DialogDescription>
        </DialogHeader>

        {/* Connectivity banner */}
        <div className="mb-2 rounded-md border p-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>Network:</span>
              <span className={netOffline ? "text-red-600" : "text-green-600"}>
                {netOffline ? "Offline" : "Online"}
              </span>
              <span className="ml-3">STUN:</span>
              <span className={stunOk === false ? "text-red-600" : stunOk ? "text-green-600" : "text-gray-500"}>
                {stunOk === null ? "…" : stunOk ? "OK" : "Blocked"}
              </span>
              <span className="ml-3">TURN:</span>
              <span className={turnOk === false ? "text-red-600" : turnOk ? "text-green-600" : "text-gray-500"}>
                {turnOk === null ? "…" : turnOk ? "OK" : "Unknown/No TURN"}
              </span>
              {usingRelayOnly && <span className="ml-3 rounded bg-gray-100 px-2 py-0.5 text-gray-700">Relay-only</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={onRestartIce} title="Restart ICE (try new paths)">
                Restart ICE
              </Button>
              {turnOk && !usingRelayOnly && (
                <Button size="sm" onClick={onForceRelay} title="Force TURN-only (fix strict NAT)">
                  Force TURN-only
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* REMOTE */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={remoteRef} className="h-full w-full object-cover" />
            <audio ref={remoteAudioRef} className="hidden" />
            {status !== "connected" && status !== "ended" && !mediaError && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                {status === "ringing" ? "Ringing…" : status === "connecting" ? "Connecting…" : "Waiting…"}
              </div>
            )}
            {status === "ended" && <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Call ended</div>}
            {mediaError && (
              <div className="absolute inset-0 grid place-items-center p-3 text-center text-sm text-white">
                <div className="rounded-lg bg-black/60 p-3">
                  <p className="mb-2">{mediaError}</p>
                  <div className="flex justify-center">
                    <Button
                      size="sm"
                      onClick={() => {
                        setMediaError(null);
                        setStatus(role === "caller" ? "ringing" : "connecting");
                        setRetryNonce((n) => n + 1);
                      }}
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LOCAL */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={localRef} className="h-full w-full object-cover" />
            {camOff && <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Camera off</div>}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          {status !== "ended" ? (
            <>
              <Button variant={muted ? "secondary" : "default"} onClick={() => setMuted((v) => !v)} className="rounded-full" title={muted ? "Unmute" : "Mute"}>
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              {mode === "video" && (
                <Button variant={camOff ? "secondary" : "default"} onClick={() => setCamOff((v) => !v)} className="rounded-full" title={camOff ? "Turn camera on" : "Turn camera off"}>
                  {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              )}

              <Button variant="destructive" onClick={onHangupClick} className="rounded-full" title="End call">
                <PhoneOff className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" disabled className="rounded-full" title="Call ended">Call ended</Button>
              <Button onClick={() => onOpenChange(false)} className="rounded-full" title="Close">Close</Button>
            </>
          )}
        </div>

        {status === "missed" && <p className="mt-2 text-center text-sm text-gray-500">No answer. Call timed out after 5 minutes.</p>}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Utils ---------- */
function formatTime(s: number) { const m = Math.floor(s / 60); const r = s % 60; return `${m}:${r.toString().padStart(2, "0")}`; }
