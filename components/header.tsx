"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Blog", href: "/blog" },
];

const SERVICES_MENU = [
  { label: "All Services", href: "/services" },
  { label: "Counseling Services", href: "/services/counseling" },
  { label: "Support Services", href: "/services/support" },
  { label: "Methadone Treatment", href: "/services/methadone" },
];

const ABOUT_MENU = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms and Conditions", href: "/terms" },
  { label: "FAQ", href: "/faq" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="relative z-50 bg-white shadow-sm border-b">
      <div className="w-full">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-[80px] lg:min-h-[90px] py-4">
            
            {/* Logo - Left Side */}
            <div className="flex-shrink-0">
              <Link
                href="/"
                className="flex items-center gap-3"
                aria-label="Serenity Rehabilitation Center Home"
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-teal-800"
                  aria-hidden="true"
                >
                  {/* Realistic Medical Facility Icon */}
                  {/* Main Building Structure */}
                  <path
                    d="M3 21V8C3 7.44772 3.44772 7 4 7H20C20.5523 7 21 7.44772 21 8V21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Roof/Upper Structure */}
                  <path
                    d="M3 8L12 3L21 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Medical Cross Badge */}
                  <circle cx="12" cy="6" r="3.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="11.25" y="4" width="1.5" height="4" fill="currentColor" rx="0.75" />
                  <rect x="9.5" y="5.25" width="5" height="1.5" fill="currentColor" rx="0.75" />
                  {/* Windows - First Row */}
                  <rect x="5.5" y="10" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  <rect x="9" y="10" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  <rect x="12.5" y="10" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  <rect x="16" y="10" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  {/* Windows - Second Row */}
                  <rect x="5.5" y="13.5" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  <rect x="9" y="13.5" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  <rect x="12.5" y="13.5" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  <rect x="16" y="13.5" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  {/* Windows - Third Row */}
                  <rect x="5.5" y="17" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  <rect x="9" y="17" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  <rect x="12.5" y="17" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  <rect x="16" y="17" width="2.2" height="2.2" rx="0.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.5" />
                  {/* Door */}
                  <rect x="10.5" y="18" width="3" height="3" rx="0.3" fill="currentColor" fillOpacity="0.6" stroke="currentColor" strokeWidth="0.8" />
                  <circle cx="12.5" cy="19.5" r="0.3" fill="currentColor" />
                </svg>
                <span className="text-[28px] lg:text-[34px] font-semibold text-teal-800 leading-tight whitespace-nowrap">
                  Serenity Rehabilitation Center
                </span>
              </Link>
            </div>

            {/* Navigation - Center (Desktop Only) */}
            <nav className="hidden lg:flex items-center justify-center flex-1 mx-12">
              <div className="flex items-center gap-12">
                {/* Services Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={[
                        "text-[18px] font-medium transition-colors whitespace-nowrap flex items-center gap-1 relative",
                        isActive("/services") ? "text-teal-800 font-semibold" : "text-slate-700 hover:text-teal-800",
                      ].join(" ")}
                    >
                      Services
                      <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="w-64 bg-white border border-gray-200 shadow-lg rounded-md mt-2 p-2 min-w-[200px]"
                  >
                    {SERVICES_MENU.map((service) => (
                      <DropdownMenuItem 
                        key={service.href} 
                        asChild
                        className="px-4 py-3 rounded-sm hover:bg-gray-50 focus:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <Link
                          href={service.href}
                          className={[
                            "block w-full text-[15px] font-normal",
                            isActive(service.href) ? "text-teal-800 font-semibold" : "text-gray-700",
                          ].join(" ")}
                        >
                          {service.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* About Us Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={[
                        "text-[18px] font-medium transition-colors whitespace-nowrap flex items-center gap-1 relative",
                        isActive("/about") || isActive("/contact") || isActive("/privacy") || isActive("/terms") || isActive("/faq") 
                          ? "text-teal-800 font-semibold" 
                          : "text-slate-700 hover:text-teal-800",
                      ].join(" ")}
                    >
                      About Us
                      <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="w-64 bg-white border border-gray-200 shadow-lg rounded-md mt-2 p-2 min-w-[200px]"
                  >
                    {ABOUT_MENU.map((item) => (
                      <DropdownMenuItem 
                        key={item.href} 
                        asChild
                        className="px-4 py-3 rounded-sm hover:bg-gray-50 focus:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <Link
                          href={item.href}
                          className={[
                            "block w-full text-[15px] font-normal",
                            isActive(item.href) ? "text-teal-800 font-semibold" : "text-gray-700",
                          ].join(" ")}
                        >
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={[
                      "text-[18px] font-medium transition-colors whitespace-nowrap",
                      isActive(item.href) ? "text-teal-800 font-semibold" : "text-slate-700 hover:text-teal-800",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            {/* Action Buttons - Right Side (Desktop Only) */}
            <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
              <Link
                href="/login"
                className="rounded-md border px-5 py-2.5 text-[15px] font-medium text-teal-800 border-teal-700/70 hover:bg-teal-50 whitespace-nowrap transition-colors"
              >
                Patient Login
              </Link>
              <Link
                href="/staff/login"
                className="rounded-md border px-5 py-2.5 text-[15px] font-medium text-slate-700 border-slate-300 hover:bg-slate-50 whitespace-nowrap transition-colors"
              >
                Staff Login
              </Link>
              <Link
                href="/intake"
                className="rounded-md px-6 py-2.5 text-[15px] font-semibold text-white whitespace-nowrap transition-all hover:opacity-90"
                style={{ backgroundColor: "#0D9AC0" }}
              >
                Get Help Now
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="lg:hidden inline-flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 text-slate-700 ml-4"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden border-t bg-white shadow-lg">
          <div className="mx-auto max-w-7xl px-6 py-5">
            <nav className="flex flex-col gap-2">
              {/* Services in Mobile */}
              <div className="py-3 px-3">
                <div className="text-[18px] font-medium text-slate-700 mb-2">Services</div>
                <div className="flex flex-col gap-1 pl-4">
                  {SERVICES_MENU.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      onClick={() => setOpen(false)}
                      className={[
                        "py-2 text-[16px] rounded-md px-3 transition-colors",
                        isActive(service.href) ? "text-teal-800 font-semibold bg-teal-50" : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {service.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* About Us in Mobile */}
              <div className="py-3 px-3">
                <div className="text-[18px] font-medium text-slate-700 mb-2">About Us</div>
                <div className="flex flex-col gap-1 pl-4">
                  {ABOUT_MENU.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={[
                        "py-2 text-[16px] rounded-md px-3 transition-colors",
                        isActive(item.href) ? "text-teal-800 font-semibold bg-teal-50" : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={[
                    "py-3 text-[18px] font-medium rounded-md px-3 transition-colors",
                    isActive(item.href) ? "text-teal-800 font-semibold bg-teal-50" : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md border px-5 py-3.5 text-[16px] font-medium text-teal-800 border-teal-700/70 text-center"
                >
                  Patient Login
                </Link>
                <Link
                  href="/staff/login"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md border px-5 py-3.5 text-[16px] font-medium text-slate-700 border-slate-300 text-center"
                >
                  Staff Login
                </Link>
                <Link
                  href="/intake"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md px-5 py-3.5 text-[17px] font-semibold text-white text-center"
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
