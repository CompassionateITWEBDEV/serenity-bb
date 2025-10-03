"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

type LatLngTuple = [number, number];

type Props = {
  address: string;          // label / directions
  center?: LatLngTuple;     // if provided, skips geocoding (recommended)
  zoom?: number;            // default 15
};

// Client-only load of react-leaflet + leaflet
const MapInner = dynamic(async () => {
  const L = await import("leaflet");
  const {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    LayersControl,
    useMap,
  } = await import("react-leaflet");

  // Fix default marker icons in Next.js
  // @ts-ignore
  delete (L.Icon.Default as any).prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  const FALLBACK_CENTER: LatLngTuple = [42.6389, -83.2910]; // Pontiac area
  const EMAIL_FOR_NOMINATIM = "maps@your-domain.tld"; // optional contact per policy

  async function geocode(query: string) {
    const url =
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&accept-language=en&email=${encodeURIComponent(
        EMAIL_FOR_NOMINATIM
      )}&q=${encodeURIComponent(query)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("geocode http");
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!data?.length) throw new Error("no results");
      const { lat, lon, display_name } = data[0];
      return { center: [parseFloat(lat), parseFloat(lon)] as LatLngTuple, label: display_name };
    } catch {
      return null; // never throw
    }
  }

  function useLocalCache<T>(key: string, initial?: T) {
    const [value, setValue] = useState<T | undefined>(() => {
      try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial; } catch { return initial; }
    });
    useEffect(() => {
      try { value === undefined ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }, [key, value]);
    return [value, setValue] as const;
  }

  function FlyTo({ center, zoom }: { center: LatLngTuple; zoom?: number }) {
    const map = useMap();
    const last = useRef("");
    useEffect(() => {
      const key = `${center[0].toFixed(5)},${center[1].toFixed(5)}:${zoom ?? ""}`;
      if (last.current === key) return;
      last.current = key;
      map.flyTo(center, zoom ?? Math.max(map.getZoom(), 15), { animate: true, duration: 0.8 });
    }, [center, zoom, map]);
    return null;
  }

  function BaseLayers() {
    return (
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OSM Standard">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Carto Positron">
          <TileLayer
            attribution="&copy; OpenStreetMap &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Esri World Imagery (satellite)">
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>
    );
  }

  function Overlay({
    clinicLabel,
    clinicCenter,
    onSearchHit,
    onLocate,
  }: {
    clinicLabel: string;
    clinicCenter: LatLngTuple;
    onSearchHit: (r: { center: LatLngTuple; label: string }) => void;
    onLocate: (pos?: LatLngTuple) => void;
  }) {
    const [q, setQ] = useState(clinicLabel);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function doSearch() {
      setBusy(true); setError("");
      const r = await geocode(q);
      if (!r) setError("No results. Try a more specific address.");
      else onSearchHit(r);
      setBusy(false);
    }
    function recenter() { onSearchHit({ center: clinicCenter, label: clinicLabel }); }
    function locateMe() {
      if (!navigator.geolocation) { setError("Geolocation not available."); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => onLocate([pos.coords.latitude, pos.coords.longitude]),
        () => setError("Unable to get your location.")
      );
    }

    return (
      <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-2">
        <div className="w-[min(92vw,360px)] rounded-lg bg-white/95 p-2 shadow">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring"
              placeholder="Search address or place"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              aria-label="Search address"
            />
            <button
              className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
              onClick={doSearch}
              disabled={busy}
            >
              {busy ? "…" : "Search"}
            </button>
          </div>
          {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
          <div className="mt-2 flex gap-2">
            <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={recenter}>Recenter</button>
            <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={locateMe}>Locate me</button>
          </div>
        </div>
      </div>
    );
  }

  function Inner({ address, center, zoom = 15 }: Props) {
    const defaultAddress = address || "Martin Luther King Jr Blvd, Pontiac, Michigan";
    const [clinic, setClinic] = useState<{ center: LatLngTuple; label: string }>({
      center: center ?? FALLBACK_CENTER,
      label: defaultAddress,
    });
    const [searchHit, setSearchHit] = useState<{ center: LatLngTuple; label: string } | null>(null);
    const [userPos, setUserPos] = useState<LatLngTuple | null>(null);

    const cacheKey = `geo:${defaultAddress}`;
    const [cached, setCached] = useLocalCache<{ center: LatLngTuple; label: string } | undefined>(cacheKey);

    useEffect(() => {
      let cancelled = false;
      if (center) return;
      (async () => {
        try {
          if (cached) { if (!cancelled) setClinic(cached); return; }
          const r = await geocode(defaultAddress);
          if (r && !cancelled) { setClinic(r); setCached(r); }
        } catch { /* swallow */ }
      })();
      return () => { cancelled = true; };
    }, [center, defaultAddress, cached, setCached]);

    const activeCenter = useMemo<LatLngTuple>(() => searchHit?.center ?? clinic.center, [searchHit, clinic.center]);

    return (
      <div className="relative h-full w-full">
        <MapContainer
          center={activeCenter}
          zoom={zoom}
          zoomControl
          style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
          scrollWheelZoom
        >
          <BaseLayers />
          <FlyTo center={activeCenter} zoom={zoom} />

          {/* Clinic marker */}
          <Marker position={clinic.center}>
            <Popup>
              <strong>Serenity Rehabilitation Center</strong>
              <br />
              {clinic.label}
              <br />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clinic.label)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions
              </a>
            </Popup>
          </Marker>

          {/* Search result marker */}
          {searchHit && (
            <Marker position={searchHit.center}>
              <Popup>{searchHit.label}</Popup>
            </Marker>
          )}

          {/* User marker */}
          {userPos && (
            <Marker position={userPos}>
              <Popup>Your location</Popup>
            </Marker>
          )}
        </MapContainer>

        <Overlay
          clinicLabel={clinic.label}
          clinicCenter={clinic.center}
          onSearchHit={(r) => setSearchHit(r)}
          onLocate={(pos) => {
            if (!pos) return;
            setUserPos(pos);
            setSearchHit({ center: pos, label: "Your location" });
          }}
        />
      </div>
    );
  }

  return Inner;
}, { ssr: false });

export default function InteractiveMap(props: Props) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border" style={{ height: 420 }}>
      <MapInner {...props} />
    </div>
  );
}
