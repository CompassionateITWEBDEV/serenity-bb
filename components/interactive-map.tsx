"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Load react-leaflet on client only (avoids SSR issues)
const MapInner = dynamic(async () => {
  const L = await import("leaflet");
  const { MapContainer, TileLayer, Marker, Popup } = await import("react-leaflet");

  // Fix Leaflet marker icons in Next.js
  // @ts-ignore
  delete (L.Icon.Default as any).prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  // Approx coords for: 123 Recovery St, Pontiac, MI 48341
  const CENTER: [number, number] = [42.6389, -83.291];

  function Inner() {
    return (
      <MapContainer
        center={CENTER}
        zoom={15}
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={CENTER}>
          <Popup>
            <strong>Serenity Rehabilitation Center</strong>
            <br />
            123 Recovery St, Pontiac, MI 48341
            <br />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                "123 Recovery St, Pontiac, MI 48341"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Directions
            </a>
          </Popup>
        </Marker>
      </MapContainer>
    );
  }

  return Inner;
}, { ssr: false });

export default function InteractiveMap() {
  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ height: 400 }}>
      <MapInner />
    </div>
  );
}
