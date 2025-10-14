"use client";

export default function CallClient(props: {
  callId: string;
  role: "caller" | "callee";
  mode: "audio" | "video";
  peer: string;
  peerName: string;
}) {
  const { callId, role, mode, peer, peerName } = props;

  // … your call setup/join logic here …
  // no useSearchParams() needed because we got everything from props

  return (
    <div className="p-4">
      {/* render your call UI */}
      <div>Call: {callId}</div>
      <div>Role: {role}</div>
      <div>Mode: {mode}</div>
      <div>Peer: {peerName}</div>
    </div>
  );
}
