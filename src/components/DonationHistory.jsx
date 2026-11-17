import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";

const CEBU = [10.3157, 123.8854];

const pin = (emoji, bg) =>
  L.divIcon({
    className: "nm-pin-wrap",
    html: `<span class="nm-pin" style="background:${bg}">${emoji}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
const ICONS = { vet: pin("🩺", "#15803d"), shelter: pin("🏠", "#1d4ed8") };

const km = (a, b, c, d) => {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15, { duration: 1 });
  }, [center, map]);
  return null;
}

const directions = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;

/** Home-page map of vets and shelters (OpenStreetMap, no API key). Needs a signed-in user. */
export default function NearbyMap() {
  const navigate = useNavigate();
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [center, setCenter] = useState(CEBU);
  const [fly, setFly] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const load = async (role, kind) => {
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", role)));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => typeof u.lat === "number" && typeof u.lng === "number")
        .map((u) => ({
          id: u.id,
          kind,
          name: u.clinicName || u.shelterName || u.name || (kind === "vet" ? "Veterinary clinic" : "Animal shelter"),
          address: u.address || "",
          phone: u.phone || "",
          hours: kind === "vet" ? u.workingHours || "" : "",
          verified: u.isVerified === true,
          lat: u.lat,
          lng: u.lng,
        }));
    };
    Promise.all([load("vet", "vet"), load("shelter", "shelter")])
      .then(([vets, shelters]) => setPlaces([...vets, ...shelters]))
      .catch((e) => {
        console.error(e);
        setError("Couldn't load the map right now.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const shown = useMemo(
    () =>
      places
        .filter((p) => filter === "all" || p.kind === filter)
        .map((p) => ({ ...p, distance: km(center[0], center[1], p.lat, p.lng) }))
        .sort((a, b) => a.distance - b.distance),
    [places, filter, center]
  );

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError("Your browser can't share its location.");
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = [pos.coords.latitude, pos.coords.longitude];
        setCenter(c);
        setFly(c);
        setLocating(false);
      },
      () => {
        setError("We couldn't get your location. Showing Cebu City instead.");
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const openPlace = (p) => navigate(p.kind === "vet" ? "/vets" : "/adopt");

  if (user === undefined) return <div className="nm-box">Loading…</div>;

  if (user === null) {
    return (
      <div className="nm-teaser">
        <style>{CSS}</style>
        <span aria-hidden="true" style={{ fontSize: "2.4rem" }}>🗺️</span>
        <h3>See vets and shelters near you</h3>
        <p>Sign in to explore the map, book a vet, or plan a shelter visit.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" className="nm-btn" onClick={() => navigate("/login")}>Sign in</button>
          <button type="button" className="nm-btn nm-ghost" onClick={() => navigate("/register")}>Create account</button>
        </div>
      </div>
    );
  }

  return (
    <div className="nm-wrap">
      <style>{CSS}</style>

      <div className="nm-bar">
        <div role="group" aria-label="Show on map" className="nm-filters">
          {[["all", "All"], ["vet", "🩺 Vets"], ["shelter", "🏠 Shelters"]].map(([k, label]) => (
            <button key={k} type="button" aria-pressed={filter === k} className={`nm-chip ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="nm-btn nm-ghost" onClick={useMyLocation} disabled={locating}>{locating ? "Locating…" : "📍 Use my location"}</button>
          <button type="button" className="nm-btn" onClick={() => navigate("/vets")}>Open full vet map →</button>
        </div>
      </div>

      {error && <p role="alert" className="nm-error">{error}</p>}

      <div className="nm-map" role="region" aria-label="Map of nearby vets and shelters">
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
          {shown.map((p) => (
            <Marker key={`${p.kind}-${p.id}`} position={[p.lat, p.lng]} icon={ICONS[p.kind]} title={p.name}>
              <Popup>
                <strong>{p.name}{p.verified && " ✓"}</strong>
                <div style={{ fontSize: 12, color: "#64748b", margin: "4px 0 8px" }}>
                  {p.kind === "vet" ? "Veterinary clinic" : "Animal shelter"}
                  {p.address && <><br />{p.address}</>}
                  {p.hours && <><br />{p.hours}</>}
                </div>
                <a href={directions(p)} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>Directions</a>
                <a href="#!" onClick={(e) => { e.preventDefault(); openPlace(p); }}>{p.kind === "vet" ? "Book a vet" : "See pets"}</a>
              </Popup>
            </Marker>
          ))}
          {fly && <FlyTo center={fly} />}
        </MapContainer>
        {loading && <div className="nm-loading">Loading places…</div>}
      </div>

      {/* The same places as a list: easier to scan, and usable without the map. */}
      {!loading && shown.length === 0 && <p className="nm-empty">No {filter === "all" ? "vets or shelters" : filter === "vet" ? "vets" : "shelters"} have put themselves on the map yet.</p>}
      <ul className="nm-list">
        {shown.slice(0, 6).map((p) => (
          <li key={`${p.kind}-${p.id}`} className="nm-item">
            <span className="nm-kind" aria-hidden="true">{p.kind === "vet" ? "🩺" : "🏠"}</span>
            <div className="nm-info">
              <strong>{p.name}{p.verified && <span className="nm-check" title="Verified" aria-label="Verified">✓</span>}</strong>
              <span>{p.kind === "vet" ? "Vet" : "Shelter"} · {p.distance.toFixed(1)} km{p.address ? ` · ${p.address}` : ""}</span>
            </div>
            <button type="button" className="nm-link" onClick={() => setFly([p.lat, p.lng])}>Show on map</button>
            <a className="nm-link" href={directions(p)} target="_blank" rel="noopener noreferrer">Directions</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CSS = `
.nm-wrap { color: #0f172a; }
.nm-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.nm-filters { display: flex; gap: 8px; flex-wrap: wrap; }
.nm-chip { padding: 8px 16px; border-radius: 999px; border: 1px solid #cbd5e1; background: #fff; color: #334155; font-weight: 700; cursor: pointer; font: inherit; }
.nm-chip.on { background: #15803d; border-color: #15803d; color: #fff; }
.nm-btn { padding: 9px 18px; border-radius: 999px; border: 2px solid #15803d; background: #15803d; color: #fff; font-weight: 700; cursor: pointer; font: inherit; }
.nm-btn.nm-ghost { background: #fff; color: #15803d; }
.nm-btn:disabled { opacity: .6; cursor: wait; }
.nm-chip:focus-visible, .nm-btn:focus-visible, .nm-link:focus-visible { outline: 3px solid #22c55e; outline-offset: 2px; }
.nm-map { position: relative; height: 420px; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15,23,42,.08); }
.nm-loading { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 500; padding: 6px 14px; border-radius: 999px; background: #0f172a; color: #fff; font-size: .8rem; }
.nm-pin-wrap { background: none; border: none; }
.nm-pin { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,.35); font-size: 17px; }
.nm-list { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 10px; }
.nm-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; flex-wrap: wrap; }
.nm-kind { font-size: 1.4rem; }
.nm-info { flex: 1; min-width: 180px; display: flex; flex-direction: column; font-size: .9rem; }
.nm-info span { color: #64748b; font-size: .82rem; }
.nm-check { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; margin-left: 6px; border-radius: 50%; background: #15803d; color: #fff; font-size: .6rem; }
.nm-link { background: none; border: none; color: #15803d; font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 4px; }
.nm-error { margin: 0 0 12px; padding: 8px 12px; border-radius: 10px; background: #fee2e2; color: #b91c1c; font-size: .88rem; }
.nm-empty { color: #64748b; margin: 14px 0 0; }
.nm-teaser, .nm-box { text-align: center; padding: 48px 24px; border: 1px dashed #bbf7d0; border-radius: 20px; background: #f0fdf4; color: #0f172a; }
.nm-teaser h3 { margin: 8px 0 6px; font-size: 1.3rem; }
.nm-teaser p { margin: 0 0 16px; color: #475569; }
@media (max-width: 640px) { .nm-map { height: 340px; } }
`;