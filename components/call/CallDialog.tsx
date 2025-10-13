"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  /** Optional: purely for UI labels/avatars */
  peerName?: string;
  peerAvatar?: string;
  meName?: string;
  /** Optional: TURN credentials for restrictive networks */
  turn?: { urls: string[]; username?: string; credential?: string };
  /** Optional: notify parent about status transitions */
  onStatus?: (s: "idle" | "ringing" | "connecting" | "connected" | "missed" | "ended" | "failed") => void;
};

export default function CallDialog({
  open,
  onOpenChange,
  conversationId,
  role,
  mode,
  meId,
  peerUserId,
  peerName,
  peerAvatar, // not used here but allowed for future UI
  meName,     // not used here but allowed for future UI
  turn,
  onStatus,
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
    onStatus, // if your hook supports it; otherwise harmless
  });

  // Close handler that always hangs up first
  const handleOpenChange = React.useCallback(
    (v: boolean) => {
      if (!v) {
        // Best-effort hangup; ignore errors
        Promise.resolve(hangup()).catch(() => {});
      }
      onOpenChange(v);
    },
    [hangup, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden" aria-describedby="call-desc">
        <DialogHeader>
          <DialogTitle>
            {mode === "video" ? "Video Call" : "Audio Call"} • {peerName || "Contact"}
            {state.status === "ringing" && (
              <span className="ml-2 text-xs text-gray-500">
                Dialing… {formatTime(state.dialSeconds)}
              </span>
            )}
            {state.status === "connecting" && (
              <span className="ml-2 text-xs text-gray-500">Connecting…</span>
            )}
            {state.status === "connected" && (
              <span className="ml-2 text-xs text-green-600">Connected</span>
            )}
            {state.status === "ended" && (
              <span className="ml-2 text-xs text-gray-500">Call ended</span>
            )}
            {state.status === "failed" && (
              <span className="ml-2 text-xs text-red-600">Failed</span>
            )}
          </DialogTitle>
          <DialogDescription id="call-desc" className="sr-only">
            Real-time {mode} call with {peerName || "contact"}.
          </DialogDescription>
        </DialogHeader>

        {/* Network diagnostics */}
        <div className="mb-2 rounded-md border p-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Network:{" "}
              {state.netOffline ? (
                <b className="text-red-600">Offline</b>
              ) : (
                <b className="text-green-600">Online</b>
              )}
            </span>
            <span>STUN: {state.stunOk === null ? "…" : state.stunOk ? "OK" : "Blocked"}</span>
            <span>TURN: {state.turnOk === null ? "…" : state.turnOk ? "OK" : "Unknown/None"}</span>
            {state.usingRelayOnly && (
              <span className="rounded bg-gray-100 px-2 py-0.5">Relay-only</span>
            )}
          </div>
        </div>

        {/* Media panes */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Remote */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={setRemoteVideoRef as any} className="h-full w-full object-cover" />
            <audio ref={setRemoteAudioRef as any} className="hidden" />
            {state.status !== "connected" && state.status !== "ended" && !state.mediaError && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                {state.status === "ringing"
                  ? "Ringing…"
                  : state.status === "connecting"
                  ? "Connecting…"
                  : "Waiting…"}
              </div>
            )}
            {state.status === "ended" && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                Call ended
              </div>
            )}
            {state.mediaError && (
              <div className="absolute inset-0 grid place-items-center p-3 text-center text-sm text-white">
                <div className="rounded-lg bg-black/60 p-3">
                  <p className="mb-2">{state.mediaError}</p>
                  <div className="flex justify-center">
                    <Button size="sm" onClick={() => handleOpenChange(false)}>
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
            {state.camOff && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                Camera off
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
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
              <Button
                variant="destructive"
                onClick={() => handleOpenChange(false)}
                className="rounded-full"
                title="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" disabled className="rounded-full">
                Call ended
              </Button>
              <Button onClick={() => handleOpenChange(false)} className="rounded-full">
                Close
              </Button>
            </>
          )}
        </div>

        {state.status === "missed" && (
          <p className="mt-2 text-center text-sm text-gray-500">
            No answer. Call timed out after 5 minutes.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
