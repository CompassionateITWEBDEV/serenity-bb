// File: app/components/header.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: "HOME", href: "/" },
  { label: "CONTACT", href: "/contact" },
  { label: "BLOG", href: "/blog" },
  { label: "SUPPORT", href: "/support" },
  { label: "ABOUT", href: "/about" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname.startsWith(href);

  return (
    <header className="relative z-50">
      {/* Top bar */}
      <div
        className="w-full"
        style={{ backgroundColor: "#6ADAB8" /* mint to match screenshot */ }}
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Left: brand */}
            <Link
              href="/"
              className="text-sm font-semibold tracking-[0.2em] text-black"
              aria-label="SPRING Home"
            >
              SPRING
            </Link>

            {/* Center: desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "text-[13px] tracking-wide transition-colors",
                    "hover:text-black/70",
                    isActive(item.href) ? "font-semibold text-black" : "text-black/70",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: CTA (desktop) */}
            <div className="hidden md:block">
              <Link
                href="/get-started"
                className="inline-flex items-center gap-2 rounded-md border border-[#1E50FF] bg-[#1E50FF] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-black/20"
              >
                Get Start
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/20 text-black"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>
        {/* Thin divider line under header (matches screenshot) */}
        <div className="h-px w-full bg-black/70" />
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden border-b border-black/70" style={{ backgroundColor: "#6ADAB8" }}>
          <div className="mx-auto max-w-7xl px-4 py-3">
            <nav className="flex flex-col">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "py-2 text-sm tracking-wide",
                    isActive(item.href) ? "font-semibold text-black" : "text-black/80",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/get-started"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-[#1E50FF] bg-[#1E50FF] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Get Start
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
