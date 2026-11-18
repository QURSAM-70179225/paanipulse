"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)) });
  return null;
}
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 10));
  }, [map, lat, lng]);
  return null;
}

export default function LocationPicker({ lat, lng, onPick }: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) {
  return (
    <MapContainer center={[lat, lng]} zoom={10} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <ClickHandler onPick={onPick} />
      <Recenter lat={lat} lng={lng} />
      <CircleMarker center={[lat, lng]} radius={9} pathOptions={{ color: "#fff", weight: 2, fillColor: "#047857", fillOpacity: 1 }} />
    </MapContainer>
  );
}
