"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { getSafeMedia, type CallMode } from "@/lib/webrtc/media";

export default function CallPage() {
  const { id } = useParams<{ id: string }>();
  const qp = useSearchParams();
  const mode = (qp.get("mode") as CallMode) || "audio";
  const role = qp.get("role") || "caller";
  const peerName = qp.get("peerName") || "Peer";

  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let pc: RTCPeerConnection | null = null;
    let localStream: MediaStream | null = null;

    (async () => {
      // 1) Acquire media safely
      localStream = await getSafeMedia(mode);
      if (!localStream) {
        setNotice("No mic/camera available. You joined in listen-only mode.");
      } else {
        if (localRef.current) {
          localRef.current.srcObject = localStream;
          await localRef.current.play().catch(() => {});
        }
      }

      // 2) Create peer connection (use your existing ICE/STUN config)
      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // 3) Attach local tracks if we have any
      if (localStream) {
        localStream.getTracks().forEach(t => pc!.addTrack(t, localStream!));
      }

      // 4) Render remote
      pc.ontrack = (e) => {
        const [stream] = e.streams;
        if (remoteRef.current && stream) {
          remoteRef.current.srcObject = stream;
          void remoteRef.current.play().catch(() => {});
        }
      };

      // --- signaling goes here (your existing websocket/supabase channel) ---
      // You already removed “ring”; keep your SDP exchange, just don’t block on media.

      // For demo only: mark “joined”
      setJoined(true);
    })();

    return () => {
      localStream?.getTracks().forEach(t => t.stop());
      pc?.getSenders().forEach(s => s.track?.stop());
      pc?.close();
    };
  }, [id, mode, role]);

  return (
    <div className="p-4">
      <div className="mb-3 text-sm text-gray-500">
        {role === "caller" ? "Calling" : "Connected to"} {peerName}
      </div>

      {notice && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-black/70 p-2">
          <video ref={localRef} muted playsInline className="h-72 w-full rounded-md bg-black object-contain" />
          <div className="mt-1 text-xs text-gray-400">You</div>
        </div>
        <div className="rounded-lg bg-black/70 p-2">
          <video ref={remoteRef} playsInline className="h-72 w-full rounded-md bg-black object-contain" />
          <div className="mt-1 text-xs text-gray-400">{peerName}</div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Status: {joined ? "Joined" : "Connecting…"}
      </div>
    </div>
  );
}
