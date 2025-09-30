// app/staff/profile/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Shield,
  Bell,
  Pill,
  HelpCircle,
  FileText,
  LogOut as LogOutIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logout } from "@/lib/staff"; // <-- real logout

export default function StaffProfilePage() {
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Teal hero */}
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

      {/* Body */}
      <main className="max-w-md mx-auto -mt-12 px-4 pb-10">
        <Card className="rounded-3xl pt-4 overflow-hidden">
          {/* Account Setting */}
          <SectionTitle>Account Setting</SectionTitle>
          <ul className="divide-y">
            <Row
              label="Personal Information"
              icon={<UserIcon className="h-5 w-5" />}
              onClick={() => router.push("/staff/settings/personal")}
            />
            <Row
              label="Password & Security"
              icon={<Shield className="h-5 w-5" />}
              onClick={() => router.push("/staff/settings/security")}
            />
            <Row
              label="Notification Preferences"
              icon={<Bell className="h-5 w-5" />}
              onClick={() => router.push("/staff/settings/notifications")}
            />
          </ul>

          {/* Others Setting */}
          <SectionTitle>Others Setting</SectionTitle>
          <ul className="divide-y">
            <Row
              label="Medication Callback Tracker"
              icon={<Pill className="h-5 w-5" />}
              onClick={() => router.push("/staff/settings/medications")}
            />
          </ul>

          {/* Support */}
          <SectionTitle>Support</SectionTitle>
          <ul className="divide-y">
            <Row
              label="Help Center"
              icon={<HelpCircle className="h-5 w-5" />}
              onClick={() => router.push("/help/faq")}
            />
            <Row
              label="Terms & Conditions"
              icon={<FileText className="h-5 w-5" />}
              onClick={() => router.push("/terms")}
            />
            <Row
              label="Logout"
              icon={<LogOutIcon className="h-5 w-5" />}
              destructive
              onClick={() => setShowLogout(true)} // open confirm modal
            />
          </ul>

          <div className="h-4" />
        </Card>
      </main>

      {/* Confirm Logout Modal */}
      {showLogout && (
        <ConfirmLogoutModal
          onCancel={() => setShowLogout(false)}
          onConfirm={async () => {
            await logout(); // Why: ensure session cleared server-side
            router.push("/staff/login");
          }}
        />
      )}
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

/* ---------- Modal ---------- */

function ConfirmLogoutModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // basic focus trap + Esc support (keeps UX tight)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onCancel]);

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 grid place-items-center"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative mx-4 w-full max-w-sm rounded-2xl bg-white shadow-xl"
      >
        <div className="p-5 text-center">
          <button
            className="absolute right-3 top-3 p-2 rounded-full hover:bg-slate-100"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
          <p className="text-base font-semibold text-slate-900">
            Are you sure you want to logout?
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-full"
              onClick={onCancel}
            >
              Stay Logged in
            </Button>
            <Button
              className="h-10 rounded-full"
              onClick={onConfirm}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
