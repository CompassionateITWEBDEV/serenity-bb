// app/staff/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
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
import { logout, getCurrentStaff, type StaffProfile } from "@/lib/staff";
import StaffVerificationStats from "@/components/staff/StaffVerificationStats";

export default function StaffProfilePage() {
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const staff = await getCurrentStaff();
        if (!staff) {
          setError("No staff profile found. Please contact support.");
          return;
        }
        setProfile(staff);
      } catch (err: any) {
        console.error("Failed to load staff profile:", err);
        setError(err?.message || "Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Helper function to get display name
  const getDisplayName = () => {
    if (!profile) return "Loading...";
    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    return fullName || profile.email?.split("@")[0] || "Staff Member";
  };

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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
              <p className="text-sm text-slate-600">Loading profile...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-6">
            <div className="text-center py-8">
              <p className="text-sm text-rose-600 mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  getCurrentStaff()
                    .then((staff) => {
                      if (staff) setProfile(staff);
                      else setError("No staff profile found.");
                    })
                    .catch((err) => setError(err?.message || "Failed to load profile"))
                    .finally(() => setLoading(false));
                }}
              >
                Retry
              </Button>
            </div>
          </Card>
        ) : !profile ? (
          <Card className="p-6">
            <div className="text-center py-8">
              <p className="text-sm text-slate-600">No profile data available.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: profile summary */}
            <Card className="lg:col-span-1 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 ring-2 ring-slate-200 flex items-center justify-center">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={getDisplayName()}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          const initials = getDisplayName()
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          parent.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-indigo-500 text-white font-semibold text-lg">${initials}</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-indigo-500 text-white font-semibold text-lg">
                      {getDisplayName()
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-base font-semibold leading-tight text-slate-900">
                    {getDisplayName()}
                  </div>
                  <div className="text-xs text-slate-500">{profile.email}</div>
                  {profile.title && (
                    <div className="text-xs text-slate-400 mt-1">{profile.title}</div>
                  )}
                  {profile.department && (
                    <div className="text-xs text-slate-400">{profile.department}</div>
                  )}
                </div>
              </div>

            <div className="mt-6 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => router.push("/staff/settings")}
              >
                Settings
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
                <Row
                  label="All Settings"
                  icon={<UserIcon className="h-5 w-5" />}
                  onClick={() => router.push("/staff/settings")}
                />
              </ul>
            </Card>

            {/* Verification Status */}
            {profile.user_id && (
              <StaffVerificationStats staffId={profile.user_id} />
            )}

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
        )}
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
