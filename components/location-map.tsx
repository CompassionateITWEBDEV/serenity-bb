"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

// Custom styles for logo marker
const logoMarkerStyles = `
  .custom-logo-marker {
    background: transparent !important;
    border: none !important;
  }
  .custom-logo-marker img {
    display: block;
  }
`;

interface LocationMapProps {
  address: string;
  latitude: number;
  longitude: number;
  height?: string;
}

export function LocationMap({ address, latitude, longitude, height = "320px" }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current) return;

    // Dynamically import Leaflet only on client side
    import("leaflet").then((L) => {

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

      // Initialize map if it doesn't exist
      if (!mapInstanceRef.current) {
        const map = L.default.map(mapRef.current).setView([latitude, longitude], 15);

        // Add OpenStreetMap tile layer (free, no API key needed)
        L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      // Update map view and marker when coordinates change
      const map = mapInstanceRef.current;
      if (map) {
        map.setView([latitude, longitude], 15);

        // Remove existing marker if it exists
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        // Create custom icon using the Serenity logo
        const logoIcon = L.default.divIcon({
          className: 'custom-logo-marker',
          html: `<img src="/2023-08-15.png" alt="Serenity Rehabilitation Center" style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); object-fit: contain; background: white;" />`,
          iconSize: [48, 48],
          iconAnchor: [24, 48],
          popupAnchor: [0, -48],
        });

        // Add new marker with custom logo icon
        const marker = L.default.marker([latitude, longitude], { icon: logoIcon }).addTo(map);
        marker.bindPopup(`<div style="text-align: center;"><b>Serenity Rehabilitation Center</b><br/>${address}</div>`).openPopup();
        markerRef.current = marker;
      }
    }).catch((error) => {
      console.error("Failed to load Leaflet:", error);
    });

    // Cleanup
    return () => {
      if (markerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
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
    <>
      <style>{logoMarkerStyles}</style>
      <div
        ref={mapRef}
        style={{ height, width: "100%" }}
        className="rounded-lg overflow-hidden border border-gray-700"
      />
    </>
  );
}
