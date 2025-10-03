"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css"; // required styles

type LatLngTuple = [number, number];

type Props = {
  address: string;          // label for popup + directions
  center?: LatLngTuple;     // optional exact coords (recommended)
  zoom?: number;            // default 15
};

/** WHY: safe dynamic import so SSR never touches window. */
async function loadMaplibre() {
  const mod = await import("maplibre-gl");
  // maplibre-gl can export as default or namespace depending on bundler flags
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((mod as any).default ?? mod) as typeof import("maplibre-gl");
}

export default function InteractiveMap({ address, center, zoom = 15 }: Props) {
  // Approx. MLK Jr Blvd, Pontiac if center not provided.
  const FALLBACK_CENTER: LatLngTuple = [42.6389, -83.2910];

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<any>(null); // maplibregl.Map
  const [lib, setLib] = useState<typeof import("maplibre-gl") | null>(null);
  const [searchHit, setSearchHit] = useState<{ center: LatLngTuple; label: string } | null>(null);
  const [error, setError] = useState("");

  const clinicCenter = useMemo<LatLngTuple>(() => center ?? FALLBACK_CENTER, [center]);
  const clinicLabel = address || "Martin Luther King Jr Blvd, Pontiac, MI 48341";

  useEffect(() => {
    let cancelled = false;
    loadMaplibre().then((m) => !cancelled && setLib(m)).catch(() => setError("Failed to load map library."));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!lib || !mapRef.current) return;
    // Destroy previous map if any (hot-reloads)
    if (mapObjRef.current) {
      try { mapObjRef.current.remove(); } catch {}
      mapObjRef.current = null;
    }

    const map = new lib.Map({
      container: mapRef.current,
      style: "https://demotiles.maplibre.org/style.json", // free, Google-like streets
      center: clinicCenter,
      zoom,
      attributionControl: true,
    });
    mapObjRef.current = map;

    // Controls: zoom, rotate, geolocate, fullscreen
    map.addControl(new lib.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new lib.GeolocateControl({ trackUserLocation: true, showUserHeading: true }), "top-right");
    map.addControl(new lib.FullscreenControl(), "top-right");

    // Clinic marker + popup
    const popupHtml = `
      <div style="font: 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
        <strong>Serenity Rehabilitation Center</strong><br/>
        ${clinicLabel}<br/>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          clinicLabel
        )}" target="_blank" rel="noopener noreferrer">Get Directions</a>
      </div>`;
    new lib.Marker({ color: "#0ea5e9" })
      .setLngLat([clinicCenter[1], clinicCenter[0]]) // MapLibre uses [lng, lat]
      .setPopup(new lib.Popup({ offset: 12 }).setHTML(popupHtml))
      .addTo(map);

    // If a search result is set later, fly to it + drop a marker
    const onSearch = (hit?: { center: LatLngTuple; label: string } | null) => {
      if (!hit) return;
      const [lat, lng] = hit.center;
      map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), essential: true });
      const mk = new lib.Marker({ color: "#22c55e" })
        .setLngLat([lng, lat])
        .setPopup(new lib.Popup({ offset: 12 }).setText(hit.label))
        .addTo(map);
      mk.togglePopup();
    };

    if (searchHit) onSearch(searchHit);

    return () => {
      try { map.remove(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib, clinicCenter, clinicLabel, zoom]);

  async function searchAddress(q: string) {
    setError("");
    if (!q.trim()) return;

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&accept-language=en&q=${encodeURIComponent(
      q
    )}`;
    try {
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      if (!res.ok) throw new Error("Search error");
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!data?.length) { setError("No results. Try a more specific address."); return; }
      const { lat, lon, display_name } = data[0];
      setSearchHit({ center: [parseFloat(lat), parseFloat(lon)], label: display_name });
      // Fly immediately if map is ready
      const map = mapObjRef.current as import("maplibre-gl").Map | null;
      if (map) {
        map.flyTo({ center: [parseFloat(lon), parseFloat(lat)], zoom: Math.max(map.getZoom(), 15), essential: true });
        new (lib as any).Marker({ color: "#22c55e" })
          .setLngLat([parseFloat(lon), parseFloat(lat)])
          .setPopup(new (lib as any).Popup({ offset: 12 }).setText(display_name))
          .addTo(map)
          .togglePopup();
      }
    } catch {
      setError("Search failed. Check your connection and try again.");
    }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg border" style={{ height: 420 }}>
      <div ref={mapRef} className="h-full w-full" />
      {/* Overlay UI (Google-like search/recenter) */}
      <div className="absolute left-3 top-3 z-[1000] flex w-[min(92vw,360px)] flex-col gap-2">
        <div className="rounded-lg bg-white/95 p-2 shadow">
          <div className="flex gap-2">
            <input
              id="map-search"
              className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring"
              placeholder="Search address or place"
              onKeyDown={(e) => {
                if (e.key === "Enter") searchAddress((e.target as HTMLInputElement).value);
              }}
              aria-label="Search address"
            />
            <button
              className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              onClick={() => {
                const el = document.getElementById("map-search") as HTMLInputElement | null;
                if (el) searchAddress(el.value);
              }}
            >
              Search
            </button>
          </div>
          {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
          <div className="mt-2 flex gap-2">
            <button
              className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
              onClick={() => {
                const map = mapObjRef.current as import("maplibre-gl").Map | null;
                if (map) map.flyTo({ center: [clinicCenter[1], clinicCenter[0]], zoom, essential: true });
              }}
            >
              Recenter
            </button>
            <a
              className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clinicLabel)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Directions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
