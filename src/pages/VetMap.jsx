import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { db, auth } from "../Firebase";
import {
  collection, query, where, getDocs, addDoc, onSnapshot,
  updateDoc, doc, serverTimestamp,
} from "firebase/firestore";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Config ────────────────────────────────────────────────────────────────────
const SERVICES = ["General Checkup", "Vaccination", "Surgery", "Grooming", "Dental Care", "Emergency"];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STATUS_STYLE = {
  confirmed: { bg: "#e8f5e9", color: "#2e7d32" },
  pending: { bg: "#fff8e1", color: "#f57f17" },
  completed: { bg: "#e3f2fd", color: "#1565c0" },
  cancelled: { bg: "#ffebee", color: "#c62828" },
};

const vetIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/616/616408.png",
  iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -42],
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLon = (lon2 - lon1) * d2r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const dayNameFor = (dateStr) => {
  if (!dateStr) return null;
  // Avoid timezone drift: parse the y-m-d parts directly.
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return DAY_NAMES[dt.getDay()];
};

function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 16, { duration: 1.2 }); }, [center, map]);
  return null;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function VetMap() {
  const [view, setView] = useState("map");
  const [search, setSearch] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [userLoc, setUserLoc] = useState([10.3157, 123.8854]);
  const [activeVet, setActiveVet] = useState(null);
  const [bookingVet, setBookingVet] = useState(null);
  const [booking, setBooking] = useState({ petName: "", ownerName: "", date: "", time: "", service: "", notes: "" });
  const [bookingError, setBookingError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(true);

  const [vets, setVets] = useState([]);
  const [vetsLoading, setVetsLoading] = useState(true);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [checkingSlots, setCheckingSlots] = useState(false);

  // Geolocation
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserLoc([p.coords.latitude, p.coords.longitude]),
      () => {}
    );
  }, []);

  // Real vets — only accounts with role "vet" that have set a clinic location.
  useEffect(() => {
    const loadVets = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "vet"));
        const snap = await getDocs(q);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((v) => typeof v.lat === "number" && typeof v.lng === "number");
        setVets(data);
      } catch (error) {
        console.error(error);
      }
      setVetsLoading(false);
    };
    loadVets();
  }, []);

  // Live appointments for the signed-in adopter
  useEffect(() => {
    if (!auth.currentUser) { setApptLoading(false); return; }
    const q = query(collection(db, "appointments"), where("userId", "==", auth.currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setApptLoading(false);
    }, () => setApptLoading(false));
    return unsub;
  }, []);

  const todayName = DAY_NAMES[new Date().getDay()];

  const filteredVets = useMemo(() => {
    return vets
      .filter((v) => {
        const dist = haversine(userLoc[0], userLoc[1], v.lat, v.lng);
        if (isEmergency) {
          return (v.availability?.[todayName]?.length || 0) > 0 && dist <= 20;
        }
        return (v.clinicName || v.name || "").toLowerCase().includes(search.toLowerCase());
      })
      .map((v) => ({ ...v, distance: haversine(userLoc[0], userLoc[1], v.lat, v.lng) }))
      .sort((a, b) => a.distance - b.distance);
  }, [vets, search, userLoc, isEmergency, todayName]);

  const openBooking = (vet) => {
    setBookingVet(vet);
    setBooking({
      petName: "",
      ownerName: auth.currentUser?.displayName || "",
      date: "",
      time: "",
      service: "",
      notes: "",
    });
    setBookedTimes([]);
    setBookingError("");
  };

  // Whenever the chosen date changes, find out which of the vet's slots are already taken.
  useEffect(() => {
    const loadTaken = async () => {
      if (!bookingVet || !booking.date) { setBookedTimes([]); return; }
      setCheckingSlots(true);
      try {
        const q = query(
          collection(db, "appointments"),
          where("vetId", "==", bookingVet.id),
          where("date", "==", booking.date)
        );
        const snap = await getDocs(q);
        const taken = snap.docs
          .map((d) => d.data())
          .filter((a) => a.status !== "cancelled")
          .map((a) => a.time);
        setBookedTimes(taken);
      } catch (error) {
        console.error(error);
      }
      setCheckingSlots(false);
    };
    loadTaken();
  }, [bookingVet, booking.date]);

  const dayForSelectedDate = dayNameFor(booking.date);
  const candidateTimes = (bookingVet?.availability?.[dayForSelectedDate]) || [];
  const availableTimes = candidateTimes.filter((t) => !bookedTimes.includes(t));

  const confirmBooking = async () => {
    if (!booking.petName.trim()) { setBookingError("Please enter your pet's name."); return; }
    if (!booking.service) { setBookingError("Please select a service."); return; }
    if (!booking.date) { setBookingError("Please pick a date."); return; }
    if (!booking.time) { setBookingError("Please select a time slot."); return; }
    if (!auth.currentUser) { setBookingError("You must be logged in."); return; }
    if (!availableTimes.includes(booking.time)) {
      setBookingError("That slot is no longer available. Please pick another.");
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, "appointments"), {
        userId: auth.currentUser.uid,
        vetId: bookingVet.id,
        vetName: bookingVet.clinicName || bookingVet.name,
        vetAddress: bookingVet.address,
        petName: booking.petName,
        ownerName: booking.ownerName,
        date: booking.date,
        time: booking.time,
        service: booking.service,
        reason: booking.service,
        notes: booking.notes,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setBookingVet(null);
    } catch (e) { setBookingError(e.message); }
    setIsSaving(false);
  };

  const cancelAppointment = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await updateDoc(doc(db, "appointments", id), { status: "cancelled" });
    } catch (error) {
      console.error(error);
    }
  };

  // Today's min date for date input
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="vm-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        @keyframes slideIn { from { opacity:0; transform:translateX(-16px) } to { opacity:1; transform:translateX(0) } }
        @keyframes popIn { from { opacity:0; transform:scale(0.9) } to { opacity:1; transform:scale(1) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(211,47,47,0.4)} 50%{box-shadow:0 0 0 10px rgba(211,47,47,0)} }

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .vm-root { font-family:'Sora',sans-serif; height:100vh; display:flex; flex-direction:column; background:#f4f8f4; }

        /* ── Topbar ── */
        .vm-topbar {
          background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 100%);
          padding:0 28px; height:66px; display:flex; align-items:center;
          justify-content:space-between; flex-shrink:0;
          box-shadow:0 4px 20px rgba(0,0,0,0.15);
        }
        .vm-brand { display:flex; align-items:center; gap:10px; }
        .vm-brand-icon { font-size:1.5rem; }
        .vm-brand-text { font-family:'DM Serif Display',serif; font-size:1.2rem; color:white; letter-spacing:-0.3px; }
        .vm-brand-sub { font-size:0.65rem; color:rgba(255,255,255,0.6); font-weight:600; text-transform:uppercase; letter-spacing:0.06em; }

        .vm-tabs { display:flex; gap:6px; }
        .vm-tab {
          padding:8px 20px; border-radius:99px; border:none; font-size:0.82rem; font-weight:700;
          cursor:pointer; transition:all 0.2s; font-family:'Sora',sans-serif;
          background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.75);
        }
        .vm-tab.active { background:white; color:#1b5e20; }
        .vm-tab-count {
          display:inline-flex; align-items:center; justify-content:center;
          width:20px; height:20px; border-radius:50%; background:#ffb300;
          color:#1a1a1a; font-size:0.68rem; font-weight:800; margin-left:6px;
        }

        /* ── Body ── */
        .vm-body { display:flex; flex:1; overflow:hidden; }

        /* ── Sidebar ── */
        .vm-sidebar {
          width:360px; flex-shrink:0; background:white;
          border-right:1px solid #e8f0e8; display:flex; flex-direction:column; overflow:hidden;
        }
        .vm-search-pane { padding:18px; border-bottom:1px solid #eef4ee; }
        .vm-emergency-btn {
          width:100%; padding:13px; border-radius:14px; border:2px solid #d32f2f;
          font-weight:800; font-size:0.85rem; cursor:pointer; margin-bottom:12px;
          transition:all 0.25s; font-family:'Sora',sans-serif; display:flex;
          align-items:center; justify-content:center; gap:8px;
        }
        .vm-emergency-btn.off { background:white; color:#d32f2f; }
        .vm-emergency-btn.on  { background:#d32f2f; color:white; animation:pulse 1.5s infinite; }
        .vm-search {
          width:100%; padding:12px 16px; border:2px solid #e8f0e8; border-radius:12px;
          font-size:0.88rem; font-family:'Sora',sans-serif; outline:none; transition:0.2s;
        }
        .vm-search:focus { border-color:#2e7d32; }

        .vm-vet-list { flex:1; overflow-y:auto; padding:14px; }
        .vm-vet-card {
          padding:18px; border-radius:18px; border:2px solid #eef4ee;
          margin-bottom:12px; cursor:pointer; transition:all 0.2s;
          animation:slideIn 0.3s ease both;
        }
        .vm-vet-card:hover { border-color:#a5d6a7; box-shadow:0 6px 18px rgba(46,125,50,0.08); transform:translateX(4px); }
        .vm-vet-card.active { border-color:#2e7d32; background:#f9fff9; }
        .vm-vet-name { font-weight:800; font-size:0.95rem; color:#1a2e1a; margin-bottom:4px; }
        .vm-vet-info { font-size:0.78rem; color:#81a881; margin-bottom:2px; display:flex; align-items:center; gap:5px; }
        .vm-vet-open { display:inline-block; margin:8px 0 10px; padding:3px 10px; border-radius:99px; font-size:0.7rem; font-weight:700; }
        .vm-vet-open.h24 { background:#fce4ec; color:#c62828; }
        .vm-vet-open.std { background:#e8f5e9; color:#2e7d32; }
        .vm-vet-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:12px; }
        .vm-tag { padding:3px 10px; background:#f1f8f1; color:#557055; border-radius:99px; font-size:0.68rem; font-weight:700; }
        .vm-book-btn {
          width:100%; padding:11px; border-radius:12px; border:none;
          background:linear-gradient(135deg,#2e7d32,#1b5e20); color:white;
          font-weight:800; font-size:0.82rem; cursor:pointer;
          font-family:'Sora',sans-serif; transition:all 0.2s;
        }
        .vm-book-btn:hover { box-shadow:0 4px 12px rgba(46,125,50,0.35); transform:translateY(-1px); }
        .vm-book-btn:disabled { background:#c8d8c8; cursor:not-allowed; box-shadow:none; transform:none; }
        .vm-no-results { text-align:center; color:#9aaa9a; padding:40px 16px; font-size:0.9rem; }

        /* ── Map ── */
        .vm-map-wrap { flex:1; position:relative; }

        /* ── Dashboard ── */
        .vm-dashboard { flex:1; overflow-y:auto; padding:36px; }
        .vm-dash-header { margin-bottom:28px; }
        .vm-dash-title { font-family:'DM Serif Display',serif; font-size:2rem; color:#1a2e1a; }
        .vm-dash-sub { color:#9aaa9a; font-size:0.85rem; margin-top:4px; }
        .vm-appt-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; }
        .vm-appt-card {
          background:white; padding:24px; border-radius:20px;
          box-shadow:0 6px 20px rgba(0,0,0,0.05); position:relative;
          animation:fadeUp 0.4s ease both; border:1px solid #eef4ee;
          transition:box-shadow 0.2s;
        }
        .vm-appt-card:hover { box-shadow:0 12px 32px rgba(0,0,0,0.09); }
        .vm-appt-status {
          display:inline-block; padding:4px 12px; border-radius:99px;
          font-size:0.68rem; font-weight:800; text-transform:uppercase;
          letter-spacing:0.06em; margin-bottom:14px;
        }
        .vm-appt-vet { font-weight:800; font-size:1rem; color:#1a2e1a; margin-bottom:4px; }
        .vm-appt-service { font-size:0.82rem; color:#2e7d32; font-weight:700; margin-bottom:10px; }
        .vm-appt-meta { font-size:0.8rem; color:#888; display:flex; flex-direction:column; gap:4px; }
        .vm-cancel-btn {
          margin-top:16px; background:none; border:none; color:#d32f2f;
          font-weight:700; font-size:0.8rem; cursor:pointer; padding:0;
          font-family:'Sora',sans-serif; transition:opacity 0.2s;
        }
        .vm-cancel-btn:hover { opacity:0.7; }
        .vm-empty-state {
          grid-column:1/-1; text-align:center; padding:60px 20px;
          background:white; border-radius:20px; border:1px solid #eef4ee;
        }
        .vm-empty-icon { font-size:3.5rem; margin-bottom:12px; }
        .vm-empty-title { font-family:'DM Serif Display',serif; font-size:1.4rem; color:#1a2e1a; margin-bottom:6px; }
        .vm-empty-sub { color:#9aaa9a; font-size:0.88rem; margin-bottom:20px; }

        /* ── Booking Modal ── */
        .vm-modal-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.55); backdrop-filter:blur(8px);
          z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px;
        }
        .vm-modal {
          background:white; width:100%; max-width:460px; border-radius:28px;
          padding:36px; animation:popIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
          max-height:90vh; overflow-y:auto; position:relative;
        }
        .vm-modal-close {
          position:absolute; top:18px; right:18px; background:#f5f5f5;
          border:none; border-radius:50%; width:32px; height:32px;
          font-size:0.9rem; cursor:pointer; color:#888; display:flex;
          align-items:center; justify-content:center; transition:background 0.2s;
        }
        .vm-modal-close:hover { background:#eee; }
        .vm-modal-vet-strip {
          display:flex; align-items:center; gap:12px; padding:14px;
          background:#f1f8f1; border-radius:14px; margin-bottom:24px;
        }
        .vm-modal-vet-icon { font-size:2rem; }
        .vm-modal-vet-name { font-weight:800; color:#1a2e1a; font-size:0.95rem; }
        .vm-modal-vet-addr { font-size:0.75rem; color:#81a881; margin-top:2px; }
        .vm-modal-title { font-family:'DM Serif Display',serif; font-size:1.6rem; color:#1a2e1a; margin-bottom:4px; }
        .vm-modal-sub { font-size:0.83rem; color:#9aaa9a; margin-bottom:20px; }

        .vm-label { display:block; font-size:0.7rem; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:#2e7d32; margin-bottom:6px; margin-top:18px; }
        .vm-select, .vm-date-input, .vm-textarea, .vm-text-input {
          width:100%; padding:12px 14px; border:2px solid #e8f0e8; border-radius:12px;
          font-size:0.9rem; font-family:'Sora',sans-serif; color:#1a2e1a; outline:none; transition:0.2s;
        }
        .vm-select:focus, .vm-date-input:focus, .vm-textarea:focus, .vm-text-input:focus { border-color:#2e7d32; }
        .vm-textarea { resize:vertical; min-height:80px; }

        .vm-time-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
        .vm-time-chip {
          padding:10px 8px; border:2px solid #e8f0e8; border-radius:12px;
          text-align:center; cursor:pointer; font-size:0.78rem; font-weight:700;
          transition:all 0.18s; font-family:'Sora',sans-serif; background:white; color:#557055;
        }
        .vm-time-chip:hover { border-color:#81c784; background:#f1f8f1; }
        .vm-time-chip.active { background:#2e7d32; color:white; border-color:#2e7d32; }
        .vm-time-empty { font-size:0.82rem; color:#9aaa9a; padding:8px 2px; }
        .vm-modal-error { font-size:0.8rem; color:#c62828; font-weight:600; margin-top:12px; }
        .vm-confirm-btn {
          width:100%; padding:15px; border-radius:14px; border:none; margin-top:20px;
          background:linear-gradient(135deg,#2e7d32,#1b5e20); color:white;
          font-size:0.92rem; font-weight:800; cursor:pointer;
          font-family:'Sora',sans-serif; transition:all 0.25s;
        }
        .vm-confirm-btn:hover:not(:disabled) { box-shadow:0 8px 20px rgba(46,125,50,0.35); transform:translateY(-1px); }
        .vm-confirm-btn:disabled { background:#c8d8c8; cursor:not-allowed; }
        .vm-back-btn {
          width:100%; padding:12px; border-radius:14px; border:2px solid #eee;
          background:white; color:#888; font-size:0.88rem; font-weight:700;
          cursor:pointer; font-family:'Sora',sans-serif; margin-top:10px; transition:0.2s;
        }
        .vm-back-btn:hover { background:#f5f5f5; }

        /* Popup override */
        .leaflet-popup-content-wrapper { border-radius:14px !important; font-family:'Sora',sans-serif; }
        .leaflet-popup-content { margin:14px !important; }

        @media(max-width:860px) {
          .vm-body { flex-direction:column; }
          .vm-sidebar { width:100%; height:45%; border-right:none; border-bottom:1px solid #e8f0e8; }
          .vm-tabs { gap:4px; }
          .vm-tab { padding:7px 13px; font-size:0.75rem; }
          .vm-dashboard { padding:20px; }
        }
      `}</style>

      {/* ── Topbar ── */}
      <header className="vm-topbar">
        <div className="vm-brand">
          <span className="vm-brand-icon">🐾</span>
          <div>
            <div className="vm-brand-text">VetAdopt</div>
            <div className="vm-brand-sub">Cebu City</div>
          </div>
        </div>
        <div className="vm-tabs">
          <button className={`vm-tab ${view === "map" ? "active" : ""}`} onClick={() => setView("map")}>
            📍 Find a Vet
          </button>
          <button className={`vm-tab ${view === "dashboard" ? "active" : ""}`} onClick={() => setView("dashboard")}>
            📅 My Visits
            {appointments.filter((a) => a.status !== "cancelled").length > 0 && (
              <span className="vm-tab-count">
                {appointments.filter((a) => a.status !== "cancelled").length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="vm-body">

        {/* ── Map View ── */}
        {view === "map" && (
          <>
            <aside className="vm-sidebar">
              <div className="vm-search-pane">
                <button
                  className={`vm-emergency-btn ${isEmergency ? "on" : "off"}`}
                  onClick={() => setIsEmergency(!isEmergency)}
                >
                  {isEmergency ? "🚨 Emergency Mode Active — Open Today Only" : "🆘 Emergency? Find Vets Open Today"}
                </button>
                {!isEmergency && (
                  <input
                    className="vm-search"
                    placeholder="🔍  Search clinics…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                )}
              </div>

              <div className="vm-vet-list">
                {vetsLoading && <div className="vm-no-results">Loading nearby vets…</div>}
                {!vetsLoading && filteredVets.length === 0 && (
                  <div className="vm-no-results">
                    {isEmergency ? "No vets with availability today nearby." : "No clinics match your search."}
                  </div>
                )}
                {!vetsLoading && filteredVets.map((v, i) => {
                  const openLabel = v.workingHours || "Hours not listed";
                  const is24 = openLabel.toLowerCase().includes("24");
                  const tags = v.specialization ? [v.specialization] : [];
                  const displayName = v.clinicName || v.name || "Veterinary Clinic";
                  return (
                    <div
                      key={v.id}
                      className={`vm-vet-card ${activeVet?.id === v.id ? "active" : ""}`}
                      style={{ animationDelay: `${i * 60}ms` }}
                      onClick={() => setActiveVet(v)}
                    >
                      <div className="vm-vet-name">{displayName}</div>
                      {v.address && <div className="vm-vet-info">📍 {v.address}</div>}
                      {v.phone && <div className="vm-vet-info">📞 {v.phone}</div>}
                      <div className="vm-vet-info">📏 {v.distance} km away</div>
                      <span className={`vm-vet-open ${is24 ? "h24" : "std"}`}>
                        🕐 {openLabel}
                      </span>
                      {tags.length > 0 && (
                        <div className="vm-vet-tags">
                          {tags.map((t) => <span key={t} className="vm-tag">{t}</span>)}
                        </div>
                      )}
                      <button className="vm-book-btn" onClick={(e) => { e.stopPropagation(); openBooking(v); }}>
                        Book Appointment
                      </button>
                    </div>
                  );
                })}
              </div>
            </aside>

            <div className="vm-map-wrap">
              <MapContainer center={userLoc} zoom={14} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />
                {filteredVets.map((v) => (
                  <Marker key={v.id} position={[v.lat, v.lng]} icon={vetIcon} eventHandlers={{ click: () => setActiveVet(v) }}>
                    <Popup>
                      <div>
                        <strong style={{ color: "#2e7d32", fontFamily: "'Sora',sans-serif" }}>
                          {v.clinicName || v.name}
                        </strong>
                        <p style={{ fontSize: "0.78rem", color: "#666", margin: "4px 0 8px" }}>
                          {v.address}<br />{v.workingHours || "Hours not listed"}
                        </p>
                        <button
                          onClick={() => openBooking(v)}
                          style={{ background: "#2e7d32", color: "white", border: "none", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "0.78rem" }}
                        >
                          Book Now
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {activeVet && <MapFlyTo center={[activeVet.lat, activeVet.lng]} />}
              </MapContainer>
            </div>
          </>
        )}

        {/* ── Dashboard ── */}
        {view === "dashboard" && (
          <div className="vm-dashboard">
            <div className="vm-dash-header">
              <h1 className="vm-dash-title">My Scheduled Visits</h1>
              <p className="vm-dash-sub">
                {apptLoading ? "Loading…" : `${appointments.length} appointment${appointments.length !== 1 ? "s" : ""} on record`}
              </p>
            </div>
            <div className="vm-appt-grid">
              {appointments.length === 0 && !apptLoading ? (
                <div className="vm-empty-state">
                  <div className="vm-empty-icon">📅</div>
                  <div className="vm-empty-title">No visits yet</div>
                  <p className="vm-empty-sub">Book your first appointment with a trusted vet in Cebu.</p>
                  <button className="vm-book-btn" style={{ width: "auto", padding: "11px 28px" }} onClick={() => setView("map")}>
                    Find a Vet →
                  </button>
                </div>
              ) : (
                appointments
                  .slice()
                  .sort((a, b) => (a.date > b.date ? 1 : -1))
                  .map((appt, i) => {
                    const s = STATUS_STYLE[appt.status] || STATUS_STYLE.pending;
                    return (
                      <div key={appt.id} className="vm-appt-card" style={{ animationDelay: `${i * 60}ms` }}>
                        <span className="vm-appt-status" style={{ background: s.bg, color: s.color }}>{appt.status}</span>
                        <div className="vm-appt-vet">{appt.vetName}</div>
                        {appt.petName && <div className="vm-appt-service">🐾 {appt.petName}</div>}
                        <div className="vm-appt-service">🏷️ {appt.service}</div>
                        <div className="vm-appt-meta">
                          <span>📅 {formatDate(appt.date)}</span>
                          <span>⏰ {appt.time}</span>
                          {appt.vetAddress && <span>📍 {appt.vetAddress}</span>}
                          {appt.notes && <span style={{ fontStyle: "italic", marginTop: "4px" }}>"{appt.notes}"</span>}
                        </div>
                        {appt.status !== "cancelled" && appt.status !== "completed" && (
                          <button className="vm-cancel-btn" onClick={() => cancelAppointment(appt.id)}>
                            Cancel Visit
                          </button>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Booking Modal ── */}
      {bookingVet && (
        <div className="vm-modal-overlay" onClick={() => setBookingVet(null)}>
          <div className="vm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="vm-modal-close" onClick={() => setBookingVet(null)}>✕</button>

            <div className="vm-modal-vet-strip">
              <span className="vm-modal-vet-icon">🏥</span>
              <div>
                <div className="vm-modal-vet-name">{bookingVet.clinicName || bookingVet.name}</div>
                <div className="vm-modal-vet-addr">
                  {bookingVet.address} · {bookingVet.workingHours || "Hours not listed"}
                </div>
              </div>
            </div>

            <h2 className="vm-modal-title">Schedule a Visit</h2>
            <p className="vm-modal-sub">Choose your service, date, and one of this vet's open times.</p>

            <label className="vm-label">Pet Name</label>
            <input
              className="vm-text-input"
              placeholder="e.g. Bruno"
              value={booking.petName}
              onChange={(e) => setBooking({ ...booking, petName: e.target.value })}
            />

            <label className="vm-label">Owner Name</label>
            <input
              className="vm-text-input"
              placeholder="Your name"
              value={booking.ownerName}
              onChange={(e) => setBooking({ ...booking, ownerName: e.target.value })}
            />

            <label className="vm-label">Service Type</label>
            <select className="vm-select" value={booking.service} onChange={(e) => setBooking({ ...booking, service: e.target.value })}>
              <option value="">— Select a service —</option>
              {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <label className="vm-label">Date</label>
            <input
              className="vm-date-input"
              type="date"
              min={today}
              value={booking.date}
              onChange={(e) => setBooking({ ...booking, date: e.target.value, time: "" })}
            />

            <label className="vm-label">Available Times</label>
            {!booking.date && (
              <p className="vm-time-empty">Pick a date to see this vet's open times.</p>
            )}
            {booking.date && checkingSlots && (
              <p className="vm-time-empty">Checking availability…</p>
            )}
            {booking.date && !checkingSlots && candidateTimes.length === 0 && (
              <p className="vm-time-empty">This vet isn't available on {dayForSelectedDate}s. Try another date.</p>
            )}
            {booking.date && !checkingSlots && candidateTimes.length > 0 && availableTimes.length === 0 && (
              <p className="vm-time-empty">All slots for this day are booked. Try another date.</p>
            )}
            {booking.date && !checkingSlots && availableTimes.length > 0 && (
              <div className="vm-time-grid">
                {availableTimes.map((t) => (
                  <div
                    key={t}
                    className={`vm-time-chip ${booking.time === t ? "active" : ""}`}
                    onClick={() => setBooking({ ...booking, time: t })}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}

            <label className="vm-label">Notes (Optional)</label>
            <textarea
              className="vm-textarea"
              placeholder="Describe your pet's symptoms or any special requests…"
              value={booking.notes}
              onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
            />

            {bookingError && <p className="vm-modal-error">⚠️ {bookingError}</p>}

            <button className="vm-confirm-btn" onClick={confirmBooking} disabled={isSaving}>
              {isSaving ? "Confirming…" : "Request Appointment"}
            </button>
            <button className="vm-back-btn" onClick={() => setBookingVet(null)}>Go Back</button>
          </div>
        </div>
      )}
    </div>
  );
}