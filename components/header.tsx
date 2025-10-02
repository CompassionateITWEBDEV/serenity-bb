// File: app/components/header.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="relative z-50 bg-white shadow-sm border-b">
      <div className="w-full">
        <div className="mx-auto max-w-7xl px-4">
          {/* Larger vertical space supports bigger text */}
          <div className="flex items-center justify-between min-h-[72px] md:min-h-[84px] py-3 md:py-4">
            {/* Left: brand */}
            <Link
              href="/"
              className="flex items-center gap-2"
              aria-label="Serenity Rehabilitation Center Home"
            >
              {/* simple heart icon */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-teal-800"
                aria-hidden="true"
              >
                <path
                  d="M12 21s-7-4.6-9.3-8.1C.6 10 .8 6.8 3.2 5.3c1.9-1.2 4.6-.6 5.8 1.1C10.2 4.7 13 .5 17 3c2.4 1.5 2.8 4.8 1 7.2C15.6 15.5 12 21 12 21Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                />
              </svg>
              <span className="text-[22px] md:text-[26px] font-semibold text-teal-800 leading-snug">
                Serenity Rehabilitation Center
              </span>
            </Link>

            {/* Center: desktop nav */}
            <nav className="hidden md:flex items-center gap-9">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={[
                    "text-[17px] leading-relaxed transition-colors",
                    isActive(item.href) ? "text-teal-800 font-semibold" : "text-slate-700 hover:text-teal-800",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: actions */}
            <div className="hidden md:flex items-center gap-3.5">
              <Link
                href="/login"
                className="rounded-md border px-3.5 py-2 text-base font-medium text-teal-800 border-teal-700/70 hover:bg-teal-50"
              >
                Patient Login
              </Link>
              <Link
                href="/staff/login"
                className="rounded-md border px-3.5 py-2 text-base font-medium text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                Staff Login
              </Link>
              <Link
                href="/intake"
                className="rounded-md px-4.5 py-2.5 text-base font-semibold text-white"
                style={{ backgroundColor: "#0D9AC0" }} // keep brand color
              >
                Get Help Now
              </Link>
            </div>

            {/* Mobile hamburger (≥44px target) */}
            <button
              className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-md border border-black/10 text-slate-700"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>

        {/* subtle bottom line */}
        <div className="h-px w-full bg-slate-200" />
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden border-b bg-white">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={[
                    "py-2.5 text-[17px]",
                    isActive(item.href) ? "text-teal-800 font-semibold" : "text-slate-700",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-md border px-3.5 py-2.5 text-[16px] font-medium text-teal-800 border-teal-700/70"
                >
                  Patient Login
                </Link>
                <Link
                  href="/staff/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-md border px-3.5 py-2.5 text-[16px] font-medium text-slate-700 border-slate-300"
                >
                  Staff Login
                </Link>
              </div>
              <Link
                href="/intake"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md px-4.5 py-2.5 text-[17px] font-semibold text-white"
                style={{ backgroundColor: "#0D9AC0" }}
              >
                Get Help Now
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
