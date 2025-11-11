"use client";

import { useEffect, useRef, useState } from "react";

interface LocationMapProps {
  address: string;
  latitude: number;
  longitude: number;
  height?: string;
}

export function LocationMap({ address, latitude, longitude, height = "320px" }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current || mapInstanceRef.current) return;

    // Dynamically import Leaflet only on client side
    import("leaflet").then((L) => {
      // Import CSS
      import("leaflet/dist/leaflet.css");

      // Fix for default marker icon in Next.js
      if (typeof window !== "undefined") {
        delete (L.default.Icon.Default.prototype as any)._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });
      }

      if (!mapRef.current) return;

      // Initialize map
      const map = L.default.map(mapRef.current).setView([latitude, longitude], 15);

      // Add OpenStreetMap tile layer (free, no API key needed)
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add marker for the location
      const marker = L.default.marker([latitude, longitude]).addTo(map);
      marker.bindPopup(`<b>Serenity Rehabilitation Center</b><br>${address}`).openPopup();

      mapInstanceRef.current = map;
    }).catch((error) => {
      console.error("Failed to load Leaflet:", error);
    });

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, latitude, longitude, address]);

  if (!isClient) {
    return (
      <div
        style={{ height, width: "100%" }}
        className="rounded-lg overflow-hidden border border-gray-700 bg-gray-100 flex items-center justify-center"
      >
        <p className="text-gray-500 text-sm">Loading map...</p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%" }}
      className="rounded-lg overflow-hidden border border-gray-700"
    />
  );
}
