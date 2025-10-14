"use client";

import { useSearchParams } from "next/navigation";

export default function CallWithHook({ callId }: { callId: string }) {
  const sp = useSearchParams(); // safe because we're under <Suspense>
  const role = (sp.get("role") as "caller" | "callee") ?? "caller";
  const mode = (sp.get("mode") as "audio" | "video") ?? "audio";
  const peer = sp.get("peer") ?? "";
  const peerName = sp.get("peerName") ?? "Contact";

  // … your call setup/join logic …

  return <div>Call {callId} ({role}/{mode}) with {peerName}</div>;
}
