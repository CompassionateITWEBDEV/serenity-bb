// B) FILE: components/ui/header.tsx  (ensure client + default export)
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(SUPABASE_URL, SUPABASE_ANON);
}

function HeaderAvatar() {
  const [src, setSrc] = useState<string | null>(null);
  const [initials, setInitials] = useState("SC");
  const mounted = useRef(true);

  const loadAvatar = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) { setSrc(null); setInitials("SC"); return; }

    const { data } = (await supabase.auth.getSession()) as { data: { session: Session | null } };
    const user: User | undefined = data?.session?.user ?? undefined;
    if (!user) { setSrc(null); setInitials("SC"); return; }

    const meta: Record<string, any> = user.user_metadata ?? {};
    const first = String(meta.first_name ?? meta.firstName ?? "").trim();
    const last = String(meta.last_name ?? meta.lastName ?? "").trim();
    const init = ((first.charAt(0) + last.charAt(0)) || "SC").toUpperCase();
    if (mounted.current) setInitials(init);

    const { data: row } = await supabase
      .from("patients")
      .select("avatar")
      .eq("user_id", user.id)
      .maybeSingle();

    const url = row?.avatar ?? meta.avatar_url ?? null;
    if (mounted.current) setSrc(url ? `${url}?v=${Date.now()}` : null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadAvatar();
    const onChanged = () => loadAvatar();
    window.addEventListener("avatar-changed", onChanged);
    return () => { mounted.current = false; window.removeEventListener("avatar-changed", onChanged); };
  }, [loadAvatar]);

  return (
    <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden grid place-items-center" title={initials} aria-label="User avatar">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="User avatar" className="h-full w-full object-cover" onError={() => setSrc(null)} />
      ) : (
        <span className="text-xs font-semibold text-gray-700">{initials}</span>
      )}
    </div>
  );
}

export default function Header() {
  const nav = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header role="banner" className="w-full border-b bg-white">
      <div className="mx-auto max-w-7xl h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="font-semibold text-gray-900 hover:opacity-90" aria-label="Serenity Connect home">
            Serenity Connect
          </a>
          <nav aria-label="Primary">
            <ul className="hidden md:flex items-center gap-4 text-sm text-gray-700">
              {nav.map((n) => (
                <li key={n.href}>
                  <a className="hover:text-gray-900" href={n.href}>{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <HeaderAvatar />
        </div>
      </div>
    </header>
  );
}
