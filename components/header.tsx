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
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between min-h-[76px] md:min-h-[88px] py-4 md:py-5">
            {/* Left: brand with more breathing room */}
            <Link
              href="/"
              className="flex items-center gap-2.5"
              aria-label="Serenity Rehabilitation Center Home"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                className="text-teal-800 flex-shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M12 21s-7-4.6-9.3-8.1C.6 10 .8 6.8 3.2 5.3c1.9-1.2 4.6-.6 5.8 1.1C10.2 4.7 13 .5 17 3c2.4 1.5 2.8 4.8 1 7.2C15.6 15.5 12 21 12 21Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                />
              </svg>
              <span className="text-[27px] md:text-[33px] font-semibold text-teal-800 leading-tight whitespace-nowrap">
                Serenity Rehabilitation Center
              </span>
            </Link>

            {/* Center: desktop nav with better spacing */}
            <nav className="hidden lg:flex items-center gap-10 flex-1 justify-center">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={[
                    "text-[18px] font-medium leading-relaxed transition-colors whitespace-nowrap",
                    isActive(item.href) ? "text-teal-800 font-semibold" : "text-slate-700 hover:text-teal-800",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: actions */}
            <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
              <Link
                href="/login"
                className="rounded-md border px-4 py-2.5 text-[15px] font-medium text-teal-800 border-teal-700/70 hover:bg-teal-50 whitespace-nowrap transition-colors"
              >
                Patient Login
              </Link>
              <Link
                href="/staff/login"
                className="rounded-md border px-4 py-2.5 text-[15px] font-medium text-slate-700 border-slate-300 hover:bg-slate-50 whitespace-nowrap transition-colors"
              >
                Staff Login
              </Link>
              <Link
                href="/intake"
                className="rounded-md px-5 py-2.5 text-[15px] font-semibold text-white whitespace-nowrap transition-all hover:opacity-90"
                style={{ backgroundColor: "#0D9AC0" }}
              >
                Get Help Now
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-md border border-black/10 text-slate-700 ml-auto"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="h-px w-full bg-slate-200" />
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-b bg-white">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <nav className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={[
                    "py-3 text-[18px] font-medium",
                    isActive(item.href) ? "text-teal-800 font-semibold" : "text-slate-700",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2.5">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md border px-4 py-3 text-[16px] font-medium text-teal-800 border-teal-700/70 text-center"
                >
                  Patient Login
                </Link>
                <Link
                  href="/staff/login"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md border px-4 py-3 text-[16px] font-medium text-slate-700 border-slate-300 text-center"
                >
                  Staff Login
                </Link>
                <Link
                  href="/intake"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md px-4 py-3 text-[17px] font-semibold text-white text-center"
                  style={{ backgroundColor: "#0D9AC0" }}
                >
                  Get Help Now
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
