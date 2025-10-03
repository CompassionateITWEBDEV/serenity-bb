"use client";

import React, { useEffect, useRef, useState } from "react";

type LatLng = [number, number];

type Props = {
  address: string;      // NOTE: lower-case 'address'
  center?: LatLng;      // [lat, lng]
  zoom?: number;        // default 15
};

/* Safe, client-only loader */
async function getMaplibre() {
  const m = await import("maplibre-gl");
  // @ts-expect-error default/namespace varies by bundler
  return (m.default ?? m) as typeof import("maplibre-gl");
}

export default function InteractiveMap({ address, center, zoom = 15 }: Props) {
  const DEFAULT: LatLng = [42.6389, -83.2910]; // MLK Jr Blvd, Pontiac (approx)
  const latlng = center ?? DEFAULT;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!containerRef.current) return;

        const maplibre = await getMaplibre();
        if (cancelled) return;

        // Cleanup existing (hot reload)
        if (mapRef.current) {
          try { mapRef.current.remove(); } catch {}
          mapRef.current = null;
        }

        const map = new maplibre.Map({
          container: containerRef.current,
          style: "https://demotiles.maplibre.org/style.json", // free, google-like
          center: [latlng[1], latlng[0]], // [lng, lat]
          zoom,
          attributionControl: true,
        });
        mapRef.current = map;

        map.addControl(new maplibre.NavigationControl({ visualizePitch: true }), "top-right");
        map.addControl(new maplibre.GeolocateControl({ trackUserLocation: true, showUserHeading: true }), "top-right");
        map.addControl(new maplibre.FullscreenControl(), "top-right");

        const popupHtml = `
          <div style="font:13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
            <strong>Serenity Rehabilitation Center</strong><br/>
            ${address}<br/>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}"
               target="_blank" rel="noopener noreferrer">Get Directions</a>
          </div>`;

        new maplibre.Marker({ color: "#0ea5e9" })
          .setLngLat([latlng[1], latlng[0]])
          .setPopup(new maplibre.Popup({ offset: 12 }).setHTML(popupHtml))
          .addTo(map);
      } catch (e) {
        console.error("Map init failed:", e);
        setError("Map unavailable right now. Try again later.");
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
  }, [address, latlng, zoom]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg border" style={{ height: 420 }}>
      <div ref={containerRef} className="h-full w-full" />
      {/* Small overlay controls + fallback message */}
      <div className="absolute left-3 top-3 z-[1000] rounded-md bg-white/95 p-2 shadow">
        <div className="flex gap-2">
          <button
            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
            onClick={() => {
              const m = mapRef.current;
              if (m) m.flyTo({ center: [latlng[1], latlng[0]], zoom, essential: true });
            }}
          >
            Recenter
          </button>
          <a
            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Directions
          </a>
        </div>
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </div>
    </div>
  );
}
