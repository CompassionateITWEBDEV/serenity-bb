// app/components/header.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Small avatar widget used inside the right side of the header bar
function HeaderAvatar() {
  const [src, setSrc] = useState<string | null>(null);
  const [initials, setInitials] = useState("??");

  const loadAvatar = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;
    if (!user) return;

    const meta: any = user.user_metadata ?? {};
    const first = meta.first_name ?? meta.firstName ?? "";
    const last  = meta.last_name  ?? meta.lastName  ?? "";
    setInitials(((first.charAt(0) + last.charAt(0)) || "??").toUpperCase());

    // Prefer DB avatar; fall back to auth metadata
    const { data: row } = await supabase
      .from("patients")
      .select("avatar")
      .eq("user_id", user.id)
      .maybeSingle();

    const url = row?.avatar ?? meta.avatar_url ?? null;
    setSrc(url ? `${url}?v=${Date.now()}` : null); // cache-buster
  }, []);

  // Initial load + listen for "avatar-changed" broadcasts
  useEffect(() => {
    loadAvatar();
    const onChanged = () => loadAvatar();
    window.addEventListener("avatar-changed", onChanged);
    return () => window.removeEventListener("avatar-changed", onChanged);
  }, [loadAvatar]);

  return (
    <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden grid place-items-center" title={initials}>
      {src ? (
        <img src={src} alt="avatar" className="h-full w-full object-cover" onError={() => setSrc(null)} />
      ) : (
        <span className="text-xs font-semibold text-gray-700">{initials}</span>
      )}
    </div>
  );
}

/** The full header bar (nav) */
export default function Header() {
  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto max-w-7xl h-14 px-4 flex items-center justify-between">
        {/* left: brand + nav (put your existing nav here) */}
        <div className="flex items-center gap-4">
          <span className="font-semibold">Serenity Connect</span>
          {/* ... your nav links ... */}
        </div>

        {/* right: notifications + avatar */}
        <div className="flex items-center gap-3">
          {/* your notification bell etc */}
          <HeaderAvatar />
        </div>
      </div>
    </header>
  );
}
