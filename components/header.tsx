"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** Renders the user avatar, preferring patients.avatar then auth metadata. */
function HeaderAvatarInner() {
  const [src, setSrc] = useState<string | null>(null);
  const [initials, setInitials] = useState("??");

  const loadAvatar = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;
    if (!user) return;

    const meta: any = user.user_metadata ?? {};
    const first = meta.first_name ?? meta.firstName ?? "";
    const last  = meta.last_name ?? meta.lastName ?? "";
    const inits = ((first.charAt(0) + last.charAt(0)) || "??").toUpperCase();
    setInitials(inits);

    // Prefer DB avatar; fallback to auth metadata
    const { data: row } = await supabase
      .from("patients")
      .select("avatar")
      .eq("user_id", user.id)
      .maybeSingle();

    const url = row?.avatar ?? meta.avatar_url ?? null;
    setSrc(url ? `${url}?v=${Date.now()}` : null); // cache-buster so it updates immediately
  }, []);

  useEffect(() => {
    loadAvatar();

    // Refresh header avatar when settings page broadcasts a change
    const onChanged = () => loadAvatar();
    window.addEventListener("avatar-changed", onChanged);
    return () => window.removeEventListener("avatar-changed", onChanged);
  }, [loadAvatar]);

  return (
    <div
      className="h-8 w-8 rounded-full bg-gray-200 grid place-items-center overflow-hidden"
      title={initials}
    >
      {src ? (
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

/** Named export if you want to import { HeaderAvatar } */
export function HeaderAvatar() {
  return <HeaderAvatarInner />;
}

/** Back-compat exports so existing imports keep working */
export const Header = HeaderAvatar;  // named export `Header`
export default HeaderAvatar;         // default export
