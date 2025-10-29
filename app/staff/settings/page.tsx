"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  User as UserIcon,
  Shield,
  Bell,
  Pill,
  ArrowLeft,
} from "lucide-react";

/**
 * Main Settings page - navigation hub for all settings
 */
export default function StaffSettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/staff/profile")}
            className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        <Card className="rounded-2xl">
          <ul className="divide-y">
            <SettingsRow
              label="Personal Information"
              icon={<UserIcon className="h-5 w-5" />}
              onClick={() => router.push("/staff/settings/personal")}
            />
            <SettingsRow
              label="Password & Security"
              icon={<Shield className="h-5 w-5" />}
              onClick={() => router.push("/staff/settings/security")}
            />
            <SettingsRow
              label="Notification Preferences"
              icon={<Bell className="h-5 w-5" />}
              onClick={() => router.push("/staff/settings/notifications")}
            />
            <SettingsRow
              label="Medication Callback Tracker"
              icon={<Pill className="h-5 w-5" />}
              onClick={() => router.push("/staff/settings/medications")}
            />
          </ul>
        </Card>
      </main>
    </div>
  );
}

function SettingsRow({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <Button
        variant="ghost"
        className="w-full h-14 px-6 justify-between rounded-none text-slate-700"
        onClick={onClick}
      >
        <span className="flex items-center gap-3">
          <span className="h-9 w-9 grid place-items-center rounded-full bg-slate-100 text-slate-700">
            {icon}
          </span>
          <span className="text-sm">{label}</span>
        </span>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </Button>
    </li>
  );
}



