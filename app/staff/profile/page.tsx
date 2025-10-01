// app/staff/profile/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronRight,
  User as UserIcon,
  Shield,
  Bell,
  Pill,
  HelpCircle,
  FileText,
  LogOut as LogOutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logout } from "@/lib/staff";

export default function StaffProfilePage() {
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header (web) */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Profile Settings</h1>
            <p className="text-xs text-slate-500">Manage your account, security, and notifications</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/staff/dashboard")}
            className="text-slate-600"
          >
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: profile summary */}
          <Card className="lg:col-span-1 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 ring-2 ring-slate-200">
                <Image
                  src="/avatars/1.png"
                  alt="Avatar"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="text-base font-semibold leading-tight text-slate-900">
                  James Anderson
                </div>
                <div className="text-xs text-slate-500">Dr.oliviashah@hospitalmail.com</div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => router.push("/staff/settings/personal")}
              >
                Edit Profile
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => router.push("/staff/settings/security")}
              >
                Change Password
              </Button>
            </div>
          </Card>

          {/* Right column: settings groups */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Settings */}
            <Card className="rounded-2xl">
              <SectionHeader>Account Settings</SectionHeader>
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
            </Card>

            {/* Other Settings */}
            <Card className="rounded-2xl">
              <SectionHeader>Other Settings</SectionHeader>
              <ul className="divide-y">
                <Row
                  label="Medication Callback Tracker"
                  icon={<Pill className="h-5 w-5" />}
                  onClick={() => router.push("/staff/settings/medications")}
                />
              </ul>
            </Card>

            {/* Support */}
            <Card className="rounded-2xl">
              <SectionHeader>Support</SectionHeader>
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
                  onClick={() => setShowLogout(true)}
                />
              </ul>
            </Card>
          </div>
        </div>
      </main>

      {/* Logout Modal */}
      {showLogout && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowLogout(false)}
          />
          <div className="relative mx-6 w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="p-6 text-center">
              <p className="text-base font-semibold text-slate-900">
                Are you sure you want to logout?
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-10 rounded-full" onClick={() => setShowLogout(false)}>
                  Stay Logged in
                </Button>
                <Button
                  className="h-10 rounded-full"
                  onClick={async () => {
                    await logout(); // WHY: ensure server session cleared
                    router.push("/staff/login");
                  }}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- UI bits (web) ---------- */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-6 pt-4 pb-2 text-xs font-semibold tracking-wide text-slate-500">{children}</div>;
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
        className={`w-full h-14 px-6 justify-between rounded-none ${
          destructive ? "text-rose-600 hover:text-rose-700" : "text-slate-700"
        }`}
        onClick={onClick}
      >
        <span className="flex items-center gap-3">
          <span
            className={`h-9 w-9 grid place-items-center rounded-full ${
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
