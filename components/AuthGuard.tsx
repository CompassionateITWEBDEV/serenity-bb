"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AuthGuard(props: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setAuthed(!!sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  if (!authed) {
    // Replace with router push to /auth if you have an auth page.
    return <div className="p-6 text-sm">Please sign in to access the Staff Console.</div>;
  }
  return <>{props.children}</>;
}
