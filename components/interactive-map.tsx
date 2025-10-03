// components/interactive-map.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type LatLngTuple = [number, number];

type Props = {
  address?: string;
  center?: LatLngTuple; // precise coords if you have them
  zoom?: number;        // default 15 (closer)
};

/* WHY: dynamic to avoid SSR issues with Leaflet */
const MapInner = dynamic(async () => {
  const L = await import("leaflet");
  const {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
    LayersControl,
  } = await import("react-leaflet");

  // Fix Leaflet default icons on Next.js
  // @ts-ignore
  delete (L.Icon.Default as any).prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  /* ===== Helpers ===== */

  function useLocalCache<T>(key: string, initial?: T) {
    const [value, setValue] = useState<T | undefined>(() => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : initial;
      } catch {
        return initial;
      }
    });
    useEffect(() => {
      try {
        if (value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }, [key, value]);
    return [value, setValue] as const;
  }

  async function geocode(q: string) {
    // WHY: Nominatim, free. Keep it light; include email param per usage policy.
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&accept-language=en&email=maps@example.com&q=${encodeURIComponent(
      q
    )}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("geocode failed");
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data?.length) throw new Error("no results");
    const { lat, lon, display_name } = data[0];
    return {
      center: [parseFloat(lat), parseFloat(lon)] as LatLngTuple,
      label: display_name,
    };
  }

  function FlyTo({ center, zoom }: { center: LatLngTuple; zoom?: number }) {
    const map = useMap();
    const last = useRef<string>("");
    useEffect(() => {
      const key = `${center[0].toFixed(5)},${center[1].toFixed(5)}:${zoom ?? ""}`;
      if (last.current === key) return;
      last.current = key;
      map.flyTo(center, zoom ?? Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.8,
      });
    }, [center, zoom, map]);
    return null;
  }

  function OverlayUI(props: {
    address: string;
    mainCenter: LatLngTuple;
    onLocate: (pos?: LatLngTuple) => void;
    onSearchHit: (result: { center: LatLngTuple; label: string }) => void;
  }) {
    const { address, mainCenter, onLocate, onSearchHit } = props;
    const [query, setQuery] = useState(address);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>("");

    async function doSearch() {
      setBusy(true);
      setError("");
      try {
        const r = await geocode(query);
        onSearchHit(r);
      } catch (e) {
        setError("No results. Try a more specific address.");
      } finally {
        setBusy(false);
      }
    }

    function doRecenter() {
      onSearchHit({ center: mainCenter, label: address });
    }

    function doLocateMe() {
      if (!navigator.geolocation) return setError("Geolocation not available.");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c: LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
          onLocate(c);
        },
        () => setError("Unable to get your location.")
      );
    }

    return (
      <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-2">
        {/* Search Card */}
        <div className="rounded-lg bg-white/95 shadow p-2 w-[min(92vw,360px)]">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring"
              placeholder="Search address or place"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
            />
            <button
              className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
              onClick={doSearch}
              disabled={busy}
              aria-label="Search"
            >
              {busy ? "…" : "Search"}
            </button>
          </div>
          {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
          <div className="mt-2 flex gap-2">
            <button
              onClick={doRecenter}
              className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
              title="Recenter to clinic"
            >
              Recenter
            </button>
            <button
              onClick={doLocateMe}
              className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
              title="Locate me"
            >
              Locate me
            </button>
          </div>
        </div>

        {/* Styles Card */}
        <LayersControl position="topright" />
      </div>
    );
  }

  function BaseLayers() {
    // WHY: free tiles with a “satellite-like” option (Esri imagery).
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

  function Inner({ address, center, zoom = 15 }: Props) {
    // Default to "Martin Luther King Jr Blvd, Pontiac, MI" if no address passed
    const defaultAddress =
      address ||
      "Martin Luther King Jr Blvd, Pontiac, Michigan";

    // Fallback Pontiac center if geocode fails and no center provided
    const FALLBACK_CENTER: LatLngTuple = [42.6389, -83.291];

    const [main, setMain] = useState<{
      center: LatLngTuple;
      label: string;
    }>({
      center: center ?? FALLBACK_CENTER,
      label: defaultAddress,
    });

    const [userPos, setUserPos] = useState<LatLngTuple | null>(null);
    const [searchHit, setSearchHit] = useState<{
      center: LatLngTuple;
      label: string;
    } | null>(null);

    // cache by address
    const cacheKey = `geo:${defaultAddress}`;
    const [cached, setCached] = useLocalCache<{ center: LatLngTuple; label: string } | undefined>(cacheKey);

    // Initial geocode when no center provided
    useEffect(() => {
      if (center) return;
      let cancelled = false;

      async function go() {
        try {
          if (cached) {
            if (!cancelled) setMain(cached);
            return;
          }
          const r = await geocode(defaultAddress);
          if (!cancelled) {
            setMain(r);
            setCached(r);
          }
        } catch {
          if (!cancelled) {
            setMain((m) => ({ ...m, center: FALLBACK_CENTER }));
          }
        }
      }
      void go();
      return () => {
        cancelled = true;
      };
    }, [center, defaultAddress, cached, setCached]);

    const activeCenter = useMemo<LatLngTuple>(() => {
      return searchHit?.center ?? main.center;
    }, [searchHit, main.center]);

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

          {/* Smooth fly to current target */}
          <FlyTo center={activeCenter} zoom={zoom} />

          {/* Clinic marker */}
          <Marker position={main.center}>
            <Popup>
              <strong>Serenity Rehabilitation Center</strong>
              <br />
              {main.label}
              <br />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  main.label
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions
              </a>
            </Popup>
          </Marker>

          {/* Search result marker (if different) */}
          {searchHit && (
            <Marker position={searchHit.center}>
              <Popup>{searchHit.label}</Popup>
            </Marker>
          )}

          {/* User location marker */}
          {userPos && (
            <Marker position={userPos}>
              <Popup>Your location</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Overlay controls */}
        <OverlayUI
          address={main.label}
          mainCenter={main.center}
          onSearchHit={(r) => setSearchHit(r)}
          onLocate={(pos) => {
            setUserPos(pos ?? null);
            if (pos) setSearchHit({ center: pos, label: "Your location" });
          }}
        />
      </div>
    );
  }

  return Inner;
}, { ssr: false });

export default function InteractiveMap(props: Props) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border"
      style={{ height: 420 }}
    >
      <MapInner {...props} />
    </div>
  );
}
