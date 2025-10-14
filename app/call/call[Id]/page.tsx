// app/call/[callId]/page.tsx
import CallClient from "./CallClient";

export const dynamic = "force-dynamic"; // avoids prerendering / export errors for dynamic calls

export default function Page({
  params,
  searchParams,
}: {
  params: { callId: string };
  searchParams: { role?: string; mode?: "audio" | "video"; peer?: string; peerName?: string };
}) {
  return (
    <CallClient
      callId={params.callId}
      role={(searchParams.role as "caller" | "callee") ?? "caller"}
      mode={(searchParams.mode as "audio" | "video") ?? "audio"}
      peer={searchParams.peer ?? ""}
      peerName={searchParams.peerName ?? "Contact"}
    />
  );
}
