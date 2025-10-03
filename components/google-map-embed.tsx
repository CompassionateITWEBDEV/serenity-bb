"use client";

import React from "react";

type LatLng = [number, number];

export type GoogleMapEmbedProps = {
  /** Human-friendly address for display & directions */
  address: string;
  /** [lat, lng] center; if omitted, address will be used */
  center?: LatLng;
  /** 1–21; 15 is street-level default */
  zoom?: number;
  /** Height in px; defaults to 420 */
  height?: number;
};

/**
 * Uses Google's keyless embed (q + output=embed). No SDK or API key.
 * Chosen to avoid billing, simplify deployment, and match screenshot #1 UX.
 */
export default function GoogleMapEmbed({
  address,
  center,
  zoom = 15,
  height = 420,
}: GoogleMapEmbedProps) {
  const q = center ? `${center[0]},${center[1]}` : address;
  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&output=embed`;

  // Why: separate URLs for best UX on mobile/desktop and clearer intents.
  const openMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address,
  )}`;

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border bg-white"
      style={{ height }}
      aria-label="Map showing our location"
    >
      <iframe
        title="Location map"
        src={embedSrc}
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="absolute left-3 top-3 z-[1000] flex gap-2 rounded-md bg-white/95 p-2 shadow">
        <a
          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
          href={openMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps
        </a>
        <a
          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Directions
        </a>
      </div>
    </div>
  );
}
