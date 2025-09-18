"use client";
import React from "react";

export function RecentActivity() {
  return (
    <div className="rounded-2xl shadow p-5">
      <p className="text-sm text-gray-500 mb-2">Recent Activity</p>
      <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
        <li>No recent activity.</li>
      </ul>
    </div>
  );
}
export default RecentActivity;
