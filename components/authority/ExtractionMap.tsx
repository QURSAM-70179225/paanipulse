"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";

export interface MapFarm {
  ref: string;
  district: string;
  crop: string;
  lat: number;
  lng: number;
  intensity: number;
  excessPct: number;
  wastedKwh: number;
}

export interface MapLabels {
  excess: string;
  intensity: string;
  wasted: string;
}

type HeatFactory = (latlngs: [number, number, number][], opts: Record<string, unknown>) => L.Layer;

/** Heat layer using the classic leaflet.heat plugin (expects a global L). */
function HeatLayer({ points, max }: { points: [number, number, number][]; max: number }) {
  const map = useMap();
  useEffect(() => {
    let layer: L.Layer | null = null;
    let cancelled = false;
    (async () => {
      (window as unknown as { L: typeof L }).L = L;
      await import("leaflet.heat");
      if (cancelled) return;
      const heat = (L as unknown as { heatLayer: HeatFactory }).heatLayer;
      layer = heat(points, { radius: 28, blur: 22, maxZoom: 10, max, minOpacity: 0.35, gradient: { 0.3: "#2563eb", 0.55: "#22c55e", 0.75: "#facc15", 1: "#dc2626" } });
      layer.addTo(map);
    })();
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points, max]);
  return null;
}

/** Fit the view to the visible farms whenever the filter changes. */
function FitBounds({ farms }: { farms: MapFarm[] }) {
  const map = useMap();
  useEffect(() => {
    if (farms.length === 0) return;
    map.fitBounds(L.latLngBounds(farms.map((f) => [f.lat, f.lng] as [number, number])).pad(0.15), { maxZoom: 10 });
  }, [map, farms]);
  return null;
}

const colour = (pct: number) => (pct > 30 ? "#dc2626" : pct > 15 ? "#f59e0b" : "#16a34a");

export default function ExtractionMap({ farms, labels }: { farms: MapFarm[]; labels: MapLabels }) {
  const points = farms.map((f) => [f.lat, f.lng, f.intensity] as [number, number, number]);
  const max = Math.max(1, ...farms.map((f) => f.intensity)) * 0.8;
  return (
    <MapContainer center={[31.9, 74.0]} zoom={8} scrollWheelZoom={false} className="h-full w-full" attributionControl>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <HeatLayer points={points} max={max} />
      <FitBounds farms={farms} />
      {farms.map((f) => (
        <CircleMarker
          key={f.ref}
          center={[f.lat, f.lng]}
          radius={5}
          pathOptions={{ color: "#ffffff", weight: 1, fillColor: colour(f.excessPct), fillOpacity: 0.95 }}
        >
          <Popup>
            <strong>{f.ref}</strong> · {f.district} · {f.crop}
            <br />
            {labels.excess}: {f.excessPct.toFixed(0)}%
            <br />
            {labels.intensity}: {f.intensity.toFixed(1)} m³/acre/day
            <br />
            {labels.wasted}: {Math.round(f.wastedKwh)} kWh
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
