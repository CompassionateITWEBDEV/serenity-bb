"use client";

import React, { useEffect, useRef, useState } from "react";

type LatLng = [number, number];
type Props = { address: string; center?: LatLng; zoom?: number };

async function getMaplibre() {
  const m = await import("maplibre-gl");
  // @ts-expect-error default/namespace varies by bundler
  return (m.default ?? m) as typeof import("maplibre-gl");
}

export default function InteractiveMap({ address, center, zoom = 15 }: Props) {
  const DEFAULT: LatLng = [42.6389, -83.2910]; // MLK Jr Blvd, Pontiac
  const latlng = center ?? DEFAULT;

  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const maplibre = await getMaplibre();
        if (cancelled || !elRef.current) return;

        if (mapRef.current) {
          try { mapRef.current.remove(); } catch {}
          mapRef.current = null;
        }

        // OSM raster style (free, simple, familiar)
        const styleOSM: any = {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution:
                '© OpenStreetMap contributors | <a href="https://www.openstreetmap.org/copyright">ODbL</a>',
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        };

        const map = new maplibre.Map({
          container: elRef.current,
          style: styleOSM,
          center: [latlng[1], latlng[0]], // [lng, lat]
          zoom,
          dragRotate: false,
          pitchWithRotate: false,
          attributionControl: true,
        });
        mapRef.current = map;

        map.addControl(new maplibre.NavigationControl({ visualizePitch: false }), "top-right");
        map.addControl(new maplibre.GeolocateControl({ trackUserLocation: true, showUserHeading: true }), "top-right");
        map.addControl(new maplibre.FullscreenControl(), "top-right");

        const html =
          `<div style="font:13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
             <strong>Serenity Rehabilitation Center</strong><br/>${address}<br/>
             <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}"
                target="_blank" rel="noopener noreferrer">Get Directions</a>
           </div>`;

        new maplibre.Marker({ color: "#0ea5e9" })
          .setLngLat([latlng[1], latlng[0]])
          .setPopup(new maplibre.Popup({ offset: 12 }).setHTML(html))
          .addTo(map);

        map.once("load", () => {
          map.flyTo({ center: [latlng[1], latlng[0]], zoom, speed: 0.8, curve: 1.2, essential: true });
        });
      } catch (e) {
        console.error("Map init failed:", e);
        setError("Map unavailable right now. Please try again later.");
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
      <div ref={elRef} className="h-full w-full" />
      <div className="absolute left-3 top-3 z-[1000] flex gap-2 rounded-md bg-white/95 p-2 shadow">
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
      {error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
