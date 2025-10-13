"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, ArrowLeft } from "lucide-react";
import { useWebRTCCall, type CallMode, type CallRole } from "@/hooks/useWebRTCCall";

type Props = {
  open: boolean;                 // page keeps this true until we exit
  onExit: () => void;            // called when user hangs up or closes
  conversationId: string;
  role: CallRole;
  mode: CallMode;
  meId: string;
  peerUserId: string;
  peerName?: string;
  turn?: { urls: string[]; username?: string; credential?: string };
};

export default function CallScreen({
  open,
  onExit,
  conversationId,
  role,
  mode,
  meId,
  peerUserId,
  peerName,
  turn,
}: Props) {
  const {
    state,
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
    setMuted,
    setCamOff,
    hangup,
  } = useWebRTCCall({
    open,
    conversationId,
    role,
    mode,
    meId,
    peerUserId,
    turn,
    onStatus: (s) => {
      // optional: hook for analytics or toast
      if (s === "ended" || s === "failed" || s === "missed") {
        onExit();
      }
    },
  });

  const endCall = React.useCallback(() => {
    Promise.resolve(hangup()).finally(onExit);
  }, [hangup, onExit]);

  return (
    <div className="flex h-screen w-screen flex-col bg-black text-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <button
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Back"
          onClick={endCall}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="ml-1 text-lg font-semibold">
          {mode === "video" ? "Video Call" : "Audio Call"} • {peerName || "Contact"}
        </div>
        <div className="ml-auto text-sm opacity-80 capitalize">
          {state.status}
          {state.status === "ringing" ? ` • ${formatTime(state.dialSeconds)}` : ""}
        </div>
      </div>

      {/* Body */}
      <div className="grid flex-1 grid-cols-1 gap-3 p-4 md:grid-cols-2">
        {/* Remote */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
          <video ref={setRemoteVideoRef as any} className="h-full w-full object-cover" />
          <audio ref={setRemoteAudioRef as any} className="hidden" />
          {state.status !== "connected" && !state.mediaError && (
            <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
              {state.status === "ringing"
                ? "Ringing…"
                : state.status === "connecting"
                ? "Connecting…"
                : "Waiting…"}
            </div>
          )}
          {state.mediaError && (
            <div className="absolute inset-0 grid place-items-center p-3 text-center text-sm">
              <div className="rounded-lg bg-black/60 p-3">
                <p className="mb-2">{state.mediaError}</p>
                <Button size="sm" variant="secondary" onClick={endCall}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Local */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
          <video ref={setLocalVideoRef as any} className="h-full w-full object-cover" />
          {state.camOff && (
            <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
              Camera off
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 border-t border-white/10 px-4 py-4">
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

        <Button
          variant="destructive"
          onClick={endCall}
          className="rounded-full"
          title="End call"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
