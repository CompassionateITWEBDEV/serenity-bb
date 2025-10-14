// app/video/[callId]/page.tsx
import { Suspense } from "react";
import CallClient from "./CallClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <CallClient />
    </Suspense>
  );
}
