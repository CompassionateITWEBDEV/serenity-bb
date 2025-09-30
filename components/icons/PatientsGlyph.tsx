import * as React from "react";

/** PatientsGlyph — friendly group/list mark to match the mobile Figma style. */
export default function PatientsGlyph({
  className = "h-5 w-5",
  strokeWidth = 1.75,
}: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="Patients" className={className} fill="none">
      <circle cx="24" cy="24" r="22" fill="#E6FAFB" />
      <circle cx="24" cy="24" r="21" stroke="#22C3D6" strokeWidth={1} opacity={0.25} />
      {/* heads */}
      <circle cx="19" cy="20" r="4" stroke="#0EA5A8" strokeWidth={strokeWidth} />
      <circle cx="29.5" cy="18.5" r="3.5" stroke="#22C3D6" strokeWidth={strokeWidth} opacity={0.85}/>
      {/* shoulders */}
      <path d="M13.5 29.5c0-3.6 3.2-6.5 7.1-6.5s7.1 2.9 7.1 6.5" stroke="#0EA5A8" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M25.5 28.5c.6-2.3 3-4 5.7-4 2.6 0 4.9 1.6 5.6 3.8" stroke="#22C3D6" strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.85}/>
    </svg>
  );
}
