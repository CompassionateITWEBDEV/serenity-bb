"use client";
import React from "react";

export function QuickActions() {
  return (
    <div className="rounded-2xl shadow p-5">
      <p className="text-sm text-gray-500 mb-2">Quick Actions</p>
      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-1.5 rounded-xl border">New Session</button>
        <button className="px-3 py-1.5 rounded-xl border">Add Note</button>
        <button className="px-3 py-1.5 rounded-xl border">Invite Caregiver</button>
      </div>
    </div>
  );
}
export default QuickActions;
