import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodeAddress } from "../utils/geocode";

const CEBU = [10.3157, 123.8854];
const pinIcon = L.divIcon({
  className: "lp-pin-wrap",
  html: '<span style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#1d4ed8;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35);font-size:17px">🏠</span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}
function MoveTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView(target, Math.max(map.getZoom(), 16));
  }, [target, map]);
  return null;
}

/**
 * Lets a shelter put itself on the map. Three ways: look up the address, use the
 * device's location, or click / drag the pin. value is { lat, lng } or null.
 */
export default function LocationPicker({ value, onChange, address }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [target, setTarget] = useState(null);

  const place = (c, note) => {
    onChange(c);
    setTarget([c.lat, c.lng]);
    setMsg({ ok: true, text: note });
  };

  const fromAddress = async () => {
    if (!address?.trim()) return setMsg({ ok: false, text: "Type your address above first." });
    setBusy("address");
    setMsg(null);
    try {
      const c = await geocodeAddress(address);
      if (c) place(c, "Found it. Drag the pin if it's a little off, then save.");
      else setMsg({ ok: false, text: "We couldn't find that address. Click the map or use your location instead." });
    } catch {
      setMsg({ ok: false, text: "The address lookup isn't available right now. Click the map to place your pin." });
    }
    setBusy("");
  };

  const fromDevice = () => {
    if (!navigator.geolocation) return setMsg({ ok: false, text: "Your browser can't share its location." });
    setBusy("gps");
    setMsg(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        place({ lat: p.coords.latitude, lng: p.coords.longitude }, "Using your current location. Only do this from the shelter itself.");
        setBusy("");
      },
      () => {
        setMsg({ ok: false, text: "We couldn't get your location. Click the map to place your pin." });
        setBusy("");
      },
      { timeout: 10000 }
    );
  };

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
      <strong style={{ display: "block", marginBottom: 4 }}>Map location</strong>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6b7280" }}>
        This puts your shelter on the vet map and the home page map so adopters can find and visit you.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" onClick={fromAddress} disabled={!!busy} style={btn}>{busy === "address" ? "Looking…" : "📍 Find from my address"}</button>
        <button type="button" onClick={fromDevice} disabled={!!busy} style={btn}>{busy === "gps" ? "Locating…" : "🎯 Use my current location"}</button>
      </div>

      <div style={{ height: 260, borderRadius: 10, overflow: "hidden" }} role="region" aria-label="Map for placing your shelter pin">
        <MapContainer center={value ? [value.lat, value.lng] : CEBU} zoom={value ? 16 : 12} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
          <ClickToPlace onPick={(c) => { onChange(c); setMsg({ ok: true, text: "Pin placed. Save your profile to keep it." }); }} />
          <MoveTo target={target} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onChange({ lat: p.lat, lng: p.lng }); } }}
            />
          )}
        </MapContainer>
      </div>

      <p role="status" style={{ margin: "8px 0 0", fontSize: 13, color: msg ? (msg.ok ? "#047857" : "#b91c1c") : value ? "#047857" : "#92400e" }}>
        {msg ? msg.text : value ? `Pin set (${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}). Click the map to move it.` : "You're not on the map yet. Find your address, use your location, or click the map."}
      </p>
    </div>
  );
}

const btn = { padding: "8px 14px", border: "2px solid #2563eb", borderRadius: 8, background: "#fff", color: "#1d4ed8", fontWeight: 600, fontSize: 13, cursor: "pointer" };