"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Phone, Mail, Facebook, Instagram, LogIn, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Blog", href: "/blog" },
];

const SERVICES_MENU = [
  { label: "Counseling Services", href: "/services/counseling" },
  { label: "Support Services", href: "/services/support" },
  { label: "Methadone Treatment", href: "/services/methadone" },
];

const MORE_MENU = [
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
      {/* Top Utility Bar */}
      <div className="bg-teal-800 text-white py-2 w-full">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between text-sm gap-2 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <a href="tel:+12488383686" className="flex items-center gap-2 hover:text-teal-200 transition-colors whitespace-nowrap">
                <Phone className="w-4 h-4" />
                <span>(248) 838-3686</span>
              </a>
              <a href="mailto:info@serenityrehab.com" className="flex items-center gap-2 hover:text-teal-200 transition-colors whitespace-nowrap">
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">info@serenityrehab.com</span>
                <span className="sm:hidden">Email Us</span>
              </a>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-teal-200 transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-teal-200 transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

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
                <div className="relative w-12 h-12 lg:w-14 lg:h-14 flex-shrink-0">
                  <img
                    src="/2023-08-15 - Copy.png"
                    alt="Serenity Rehabilitation Center Logo"
                    width={56}
                    height={56}
                    className="object-contain w-full h-full"
                    style={{ display: 'block' }}
                  />
                </div>
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

                {/* More Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={[
                        "text-[18px] font-medium transition-colors whitespace-nowrap flex items-center gap-1 relative",
                        isActive("/privacy") || isActive("/terms") || isActive("/faq")
                          ? "text-teal-800 font-semibold" 
                          : "text-slate-700 hover:text-teal-800",
                      ].join(" ")}
                    >
                      More
                      <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="w-64 bg-white border border-gray-200 shadow-lg rounded-md mt-2 p-2 min-w-[200px]"
                  >
                    {MORE_MENU.map((item) => (
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
                href="/intake"
                className="rounded-md px-6 py-2.5 text-[15px] font-semibold text-white whitespace-nowrap transition-all hover:opacity-90"
                style={{ backgroundColor: "#0D9AC0" }}
              >
                Book an Appointment
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-md border px-5 py-2.5 text-[15px] font-medium text-teal-800 border-teal-700/70 hover:bg-teal-50 whitespace-nowrap transition-colors flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Login
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg rounded-md mt-2 p-2">
                  <DropdownMenuItem asChild>
                    <Link href="/login" className="flex items-center gap-2 px-4 py-3 rounded-sm hover:bg-gray-50 transition-colors cursor-pointer">
                      <User className="w-4 h-4" />
                      <span>Patient Login</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/staff/login" className="flex items-center gap-2 px-4 py-3 rounded-sm hover:bg-gray-50 transition-colors cursor-pointer">
                      <User className="w-4 h-4" />
                      <span>Staff Login</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

              {/* More in Mobile */}
              <div className="py-3 px-3">
                <div className="text-[18px] font-medium text-slate-700 mb-2">More</div>
                <div className="flex flex-col gap-1 pl-4">
                  {MORE_MENU.map((item) => (
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
                  href="/intake"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md px-5 py-3.5 text-[17px] font-semibold text-white text-center"
                  style={{ backgroundColor: "#0D9AC0" }}
                >
                  Book an Appointment
                </Link>
                <div className="text-[18px] font-medium text-slate-700 mb-2">Login</div>
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
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
