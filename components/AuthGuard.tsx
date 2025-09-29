"use client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  // Why: temporarily bypass auth so dashboard renders without a session.
  return <>{children}</>;
}
