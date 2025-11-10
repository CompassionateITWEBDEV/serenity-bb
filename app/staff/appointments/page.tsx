"use client";

import AppointmentsList from "@/components/staff/AppointmentsList";

export default function StaffAppointmentsPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto px-6 py-8 bg-white">
        <AppointmentsList />
      </main>
    </div>
  );
}


