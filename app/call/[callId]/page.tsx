import CallClient from "./CallClient";

export const dynamic = "force-dynamic";

export default function Page({
  params,
  searchParams,
}: {
  params: { callId: string };
  searchParams: { role?: "caller" | "callee"; mode?: "audio" | "video"; peer?: string; peerName?: string };
}) {
  return (
    <CallClient
      callId={params.callId}
      role={searchParams.role ?? "caller"}
      mode={(searchParams.mode as "audio" | "video") ?? "audio"}
      peer={searchParams.peer ?? ""}
      peerName={searchParams.peerName ?? "Contact"}
    />
  );
}
