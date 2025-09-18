"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HeaderAvatar() {
  const [src, setSrc] = useState<string | null>(null);
  const [initials, setInitials] = useState("??");

  const loadAvatar = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;
    if (!user) return;

    const meta: any = user.user_metadata ?? {};
    const first = meta.first_name ?? meta.firstName ?? "";
    const last  = meta.last_name ?? meta.lastName ?? "";
    setInitials(((first.charAt(0) + last.charAt(0)) || "??").toUpperCase());

    // Prefer DB avatar; fall back to auth metadata
    const { data: row } = await supabase
      .from("patients")
      .select("avatar")
      .eq("user_id", user.id)
      .maybeSingle();

    const url = row?.avatar ?? meta.avatar_url ?? null;

    // add cache-buster so the image refreshes after upload
    setSrc(url ? `${url}?v=${Date.now()}` : null);
  }, []);

  useEffect(() => {
    loadAvatar();

    // When the Settings page finishes an upload it will dispatch this event.
    const onChanged = (e: Event) => {
      // If you want, you can read the new URL via (e as CustomEvent).detail.url
      loadAvatar();
    };
    window.addEventListener("avatar-changed", onChanged);
    return () => window.removeEventListener("avatar-changed", onChanged);
  }, [loadAvatar]);

  return (
    <div
      className="h-8 w-8 rounded-full bg-gray-200 grid place-items-center overflow-hidden"
      title={initials}
    >
      {src ? (
        // plain <img> avoids Next/Image caching; shows instantly
        <img
          src={src}
          alt="avatar"
          className="h-full w-full object-cover"
          onError={() => setSrc(null)}
        />
      ) : (
        <span className="text-xs font-semibold text-gray-700">{initials}</span>
      )}
    </div>
  );
}
