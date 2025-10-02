// components/interactive-map.tsx
"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

type LatLngTuple = [number, number];

type Props = {
  address: string;
  center?: LatLngTuple; // optional precise coords if you have them
  zoom?: number;        // default 13 (wider view)
};

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

  function Inner({ address, center, zoom = 13 }: Props) {
    // Fallback to a general Pontiac center if exact coords not provided
    const FALLBACK_CENTER: LatLngTuple = [42.6389, -83.291];
    const mapCenter = center ?? FALLBACK_CENTER;

    return (
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        zoomControl
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={mapCenter}>
          <Popup>
            <strong>Serenity Rehabilitation Center</strong>
            <br />
            {address}
            <br />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                address
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

export default function InteractiveMap(props: Props) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ height: 400 }}>
      <MapInner {...props} />
    </div>
  );
}
