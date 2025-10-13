"use client";
import * as React from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, User } from "lucide-react";
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
  meName?: string;
  turn?: { urls: string[]; username?: string; credential?: string };
  onStatus?: (s: "ringing" | "connecting" | "connected" | "ended" | "missed" | "failed") => void;
};

export default function CallDialog(props: Props) {
  const {
    open, onOpenChange, conversationId, role, mode, meId, peerUserId, peerName, meName, turn, onStatus
  } = props;

  const {
    state, setLocalVideoRef, setRemoteVideoRef, setRemoteAudioRef, setMuted, setCamOff, hangup,
  } = useWebRTCCall({ open, conversationId, role, mode, meId, peerUserId, turn });

  // stable id for a11y; always present
  const descId = React.useId();

  React.useEffect(() => {
    if (!onStatus) return;
    if (state.mediaError) onStatus("failed"); else onStatus(state.status);
  }, [state.status, state.mediaError, onStatus]);

  const handleClose = async (v: boolean) => { if (!v) { try { await hangup(); } catch {} } onOpenChange(v); };
  const showVideo = mode === "video";
  const isEnded = state.status === "ended" || state.status === "missed";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* ✅ always pass aria-describedby and render a description */}
      <DialogContent className="max-w-3xl overflow-hidden" aria-describedby={descId}>
        <DialogHeader>
          <DialogTitle>
            {mode === "video" ? "Video Call" : "Audio Call"} • {peerName || "Contact"}
            {state.status === "ringing" && <span className="ml-2 text-xs text-gray-500">Dialing… {formatTime(state.dialSeconds)}</span>}
            {state.status === "connecting" && <span className="ml-2 text-xs text-gray-500">Connecting…</span>}
            {state.status === "connected" && <span className="ml-2 text-xs text-green-600">Connected</span>}
            {isEnded && <span className="ml-2 text-xs text-gray-500">{state.status === "missed" ? "Missed" : "Call ended"}</span>}
          </DialogTitle>
          {/* ✅ keep an always-present description for a11y */}
          <DialogDescription id={descId} className="sr-only">
            Real-time {mode} call between you and {peerName || "contact"}.
          </DialogDescription>
        </DialogHeader>

        {/* media area */}
        {showVideo ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              <video ref={setRemoteVideoRef as any} className="h-full w-full object-cover" />
              <audio ref={setRemoteAudioRef as any} className="hidden" />
              {state.status !== "connected" && !state.mediaError && <Overlay> {state.status === "ringing" ? "Ringing…" : state.status === "connecting" ? "Connecting…" : "Waiting…"} </Overlay>}
              {isEnded && <Overlay>Call ended</Overlay>}
              {state.mediaError && <ErrorOverlay message={state.mediaError} onClose={() => onOpenChange(false)} />}
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              <video ref={setLocalVideoRef as any} className="h-full w-full object-cover" />
              {state.camOff && <Overlay>Camera off</Overlay>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-950">
              <audio ref={setRemoteAudioRef as any} />
              <div className="flex h-full items-center justify-center text-white/80"><User className="mr-2 h-6 w-6" />{peerName || "Contact"}</div>
              {state.status !== "connected" && !state.mediaError && <Overlay>{state.status === "ringing" ? "Ringing…" : state.status === "connecting" ? "Connecting…" : "Waiting…"}</Overlay>}
              {isEnded && <Overlay>Call ended</Overlay>}
              {state.mediaError && <ErrorOverlay message={state.mediaError} onClose={() => onOpenChange(false)} />}
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900">
              <div className="flex h-full items-center justify-center text-white/80"><User className="mr-2 h-6 w-6" />{meName || "You"}</div>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-center gap-2">
          {!isEnded ? (
            <>
              <Button variant={state.muted ? "secondary" : "default"} onClick={() => setMuted(!state.muted)} className="rounded-full" title={state.muted ? "Unmute" : "Mute"}>{state.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</Button>
              {showVideo && (
                <Button variant={state.camOff ? "secondary" : "default"} onClick={() => setCamOff(!state.camOff)} className="rounded-full" title={state.camOff ? "Turn camera on" : "Turn camera off"}>{state.camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}</Button>
              )}
              <Button variant="destructive" onClick={() => (hangup(), onOpenChange(false))} className="rounded-full" title="End call"><PhoneOff className="h-5 w-5" /></Button>
            </>
          ) : (
            <>
              <Button variant="secondary" disabled className="rounded-full">{state.status === "missed" ? "Missed call" : "Call ended"}</Button>
              <Button onClick={() => onOpenChange(false)} className="rounded-full">Close</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 grid place-items-center text-sm text-white/70">{children}</div>;
}
function ErrorOverlay({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-3 text-center text-sm text-white">
      <div className="rounded-lg bg-black/60 p-3">
        <p className="mb-2">{message}</p>
        <div className="flex justify-center"><Button size="sm" onClick={onClose}>Close</Button></div>
      </div>
    </div>
  );
}
function formatTime(s: number) { const m = Math.floor(s / 60); const r = s % 60; return `${m}:${r.toString().padStart(2,"0")}`; }
ts
Copy code
