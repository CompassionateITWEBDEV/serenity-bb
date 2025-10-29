"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  HomeIcon, 
  TestTube2, 
  MessageSquare, 
  RadioIcon, 
  EyeOff, 
  Users, 
  Bell, 
  SettingsIcon,
  Stethoscope,
  HeartPulse
} from 'lucide-react';
import PatientVerificationManager from '@/components/staff/PatientVerificationManager';

// IconPill component for navigation
function IconPill({ 
  children, 
  aria, 
  active = false, 
  onClick 
}: { 
  children: React.ReactNode; 
  aria: string; 
  active?: boolean; 
  onClick?: () => void; 
}) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className={`
        flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
        ${active 
          ? 'bg-emerald-600 text-white shadow-lg' 
          : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 shadow-sm'
        }
      `}
    >
      {children}
    </button>
  );
}

export default function PatientVerificationPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Patient Verification</h1>
            <p className="text-sm text-slate-600">Manage patient verification status and documents</p>
          </div>
          
          {/* Navigation Icons */}
          <div className="flex items-center gap-3">
            {/* Core staff icons (kept consistent with staff dashboard) */}
            <IconPill aria="Dashboard" onClick={() => router.push("/staff/dashboard")}>
              <HomeIcon className="h-5 w-5" />
            </IconPill>

            <IconPill aria="Drug Tests" onClick={() => router.push("/staff/dashboard?tab=tests")}>
              <TestTube2 className="h-5 w-5" />
            </IconPill>

            <IconPill aria="Messages" onClick={() => router.push("/staff/messages")}>
              <MessageSquare className="h-5 w-5" />
            </IconPill>

            <IconPill aria="Broadcasts" onClick={() => router.push("/staff/broadcasts")}>
              <RadioIcon className="h-5 w-5" />
            </IconPill>

            <IconPill aria="Groups" onClick={() => router.push("/staff/hidden-groups")}>
              <EyeOff className="h-5 w-5" />
            </IconPill>

            <IconPill aria="Group Chat" onClick={() => router.push("/staff/group-chat")}>
              <MessageSquare className="h-5 w-5" />
            </IconPill>

            <IconPill aria="Alerts" onClick={() => router.push("/staff/notifications")}>
              <Bell className="h-5 w-5" />
            </IconPill>

            {/* Patient Verification: distinct icon */}
            <IconPill aria="Patient Verification" active onClick={() => router.push("/staff/patient-verification")}>
              <Users className="h-5 w-5" />
            </IconPill>

            <IconPill aria="Settings" onClick={() => router.push("/staff/profile")}>
              <SettingsIcon className="h-5 w-5" />
            </IconPill>

            {/* Divider then clinician-only extras */}
            <span aria-hidden className="mx-1 h-5 w-px bg-slate-300" />

            <IconPill aria="Vitals" onClick={() => router.push("/clinician/vitals")}>
              <HeartPulse className="h-5 w-5" />
            </IconPill>

            <IconPill aria="Patients" onClick={() => router.push("/clinician/patients")}>
              <Stethoscope className="h-5 w-5" />
            </IconPill>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <PatientVerificationManager />
      </main>
    </div>
  );
}
