import * as React from "react";

/** Soft medical dashboard mark to match Figma badge. */
export default function DashboardGlyph({
  className = "h-5 w-5",
  strokeWidth = 1.75,
}: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="Dashboard" className={className} fill="none">
      <circle cx="24" cy="24" r="22" fill="#E6FAFB" />
      <circle cx="24" cy="24" r="21" stroke="#22C3D6" strokeWidth={1} opacity={0.25} />
      <path d="M13.5 22h3v-3h3v3h3v3h-3v3h-3v-3h-3v-3z" fill="#0EA5A8" opacity={0.9} />
      <path d="M21 29c2.2-2.2 3.6-2.2 5.8 0 .5.5 1.2.8 2 .8h4.2" stroke="#0891B2" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}/>
      <path d="M26 28l1.1-2.5 1.2 2.2 1.1-1.6 1 1.9" stroke="#0EA5A8" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>
      <path d="M30.5 18.5c0 2 1.5 3.6 3.3 3.6s3.2-1.6 3.2-3.6" stroke="#22C3D6" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <circle cx="37" cy="22.7" r="1.6" fill="#22C3D6" opacity={0.9} />
    </svg>
  );
}
