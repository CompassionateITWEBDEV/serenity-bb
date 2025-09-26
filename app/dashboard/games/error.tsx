"use client";
import { useEffect } from "react";

export default function Error({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("dashboard/games error:", error);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error?.message ?? "A client-side exception occurred."}
      </p>
      <button onClick={reset} className="mt-4 rounded-lg border px-4 py-2">Try again</button>
    </div>
  );
}
