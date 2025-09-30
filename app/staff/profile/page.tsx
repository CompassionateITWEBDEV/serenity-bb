"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft, ChevronRight,
  User as UserIcon,
  Shield,
  Bell,
  Pill,
  HelpCircle,
  FileText,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Profile Settings (staff) — Figma-like grouped settings list.
 * Routes for items are placeholders; swap with your real pages.
 */
export default function StaffProfilePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Teal Hero */}
      <div className="bg-cyan-500 text-white">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20 relative">
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push("/staff/dashboard")}
            className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 grid place-items-center absolute left-4 top-4"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <h1 className="text-center text-lg font-semibold">Profile Setting</h1>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-white/20 ring-2 ring-white/40">
              {/* replace with user's avatar if you have it */}
              <Image
                src="/avatars/1.png"
                alt="Avatar"
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="text-base font-semibold leading-tight">James Anderson</div>
              <div className="text-xs/5 text-white/80">Dr.oliviashah@hospitalmail.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* White card body with rounded top */}
      <main className="max-w-md mx-auto -mt-12 px-4 pb-10">
        <Card className="rounded-3xl pt-4 overflow-hidden">
          {/* Account Setting */}
          <SectionTitle>Account Setting</SectionTitle>
          <ul className="divide-y">
            <Row label="Personal Information" icon={<UserIcon className="h-5 w-5" />} onClick={() => router.push("/staff/profile/personal")} />
            <Row label="Password & Security" icon={<Shield className="h-5 w-5" />} onClick={() => router.push("/staff/profile/security")} />
            <Row label="Notification Preferences" icon={<Bell className="h-5 w-5" />} onClick={() => router.push("/staff/profile/notifications")} />
          </ul>

          {/* Others Setting */}
          <SectionTitle>Others Setting</SectionTitle>
          <ul className="divide-y">
            <Row label="Medication Callback Tracker" icon={<Pill className="h-5 w-5" />} onClick={() => router.push("/staff/profile/medications")} />
          </ul>

          {/* Support */}
          <SectionTitle>Support</SectionTitle>
          <ul className="divide-y">
            <Row label="Help Center" icon={<HelpCircle className="h-5 w-5" />} onClick={() => router.push("/help")} />
            <Row label="Terms & Conditions" icon={<FileText className="h-5 w-5" />} onClick={() => router.push("/terms")} />
            <Row
              label="Logout"
              icon={<LogOut className="h-5 w-5" />}
              destructive
              onClick={() => router.push("/staff/login")} // replace with real logout flow if needed
            />
          </ul>

          <div className="h-4" />
        </Card>
      </main>
    </div>
  );
}

/* ---------- UI bits ---------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-3 pb-2 text-xs font-semibold tracking-wide text-slate-500">
      {children}
    </div>
  );
}

function Row({
  label,
  icon,
  onClick,
  destructive,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}) {
  return (
    <li>
      <Button
        variant="ghost"
        className={`w-full h-12 px-4 justify-between rounded-none ${
          destructive ? "text-rose-600 hover:text-rose-700" : "text-slate-700"
        }`}
        onClick={onClick}
      >
        <span className="flex items-center gap-3">
          <span
            className={`h-8 w-8 grid place-items-center rounded-full ${
              destructive ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-700"
            }`}
          >
            {icon}
          </span>
          <span className="text-sm">{label}</span>
        </span>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </Button>
    </li>
  );
}
