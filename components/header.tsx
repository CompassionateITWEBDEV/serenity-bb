"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HeaderAvatar() {
  const [src, setSrc] = useState<string | null>(null);
  const [initials, setInitials] = useState("??");

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;
      if (!user) return;

      const meta: any = user.user_metadata ?? {};
      const first = meta.first_name ?? meta.firstName ?? "";
      const last  = meta.last_name ?? meta.lastName ?? "";
      setInitials((first.charAt(0) + last.charAt(0) || "??").toUpperCase());

      // Prefer DB avatar; fall back to auth metadata
      const { data: row } = await supabase
        .from("patients")
        .select("avatar")
        .eq("user_id", user.id)
        .maybeSingle();

      const url = row?.avatar ?? meta.avatar_url ?? null;
      setSrc(url ? `${url}?v=${Date.now()}` : null); // cache-buster
    })();
  }, []);

  return (
    <img
      src={src ?? "/patient-avatar.png"}
      alt="avatar"
      className="h-8 w-8 rounded-full object-cover"
      onError={() => setSrc("/patient-avatar.png")}
      title={initials}
    />
  );
}
