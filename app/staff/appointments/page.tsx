"use client";

import AppointmentsList from "@/components/staff/AppointmentsList";

export default function StaffAppointmentsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AppointmentsList />
      </main>
    </div>
  );
}


