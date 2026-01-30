import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { db, auth } from "../Firebase"; // Ensure this path is correct
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- ASSETS & CONFIG ---
const VETS = [
  { id: 1, name: "Cebu Happy Paws", lat: 10.3157, lng: 123.8854, address: "Mango Ave, Cebu City", phone: "+639171234567", open: "8:00 AM - 6:00 PM" },
  { id: 2, name: "Furry Friends 24/7", lat: 10.3170, lng: 123.8920, address: "Osmeña Blvd, Cebu City", phone: "+639179876543", open: "24 Hours" },
  { id: 3, name: "Pawfect Care Cebu", lat: 10.3190, lng: 123.8900, address: "Colon St, Cebu City", phone: "+639225551234", open: "9:00 AM - 8:00 PM" },
];

const vetIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/616/616408.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

// --- HELPERS ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
};

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 16); }, [center, map]);
  return null;
}

// --- MAIN COMPONENT ---
function VetMap() {
  const [view, setView] = useState("map");
  const [search, setSearch] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [userLoc, setUserLoc] = useState([10.3157, 123.8854]); // Default Cebu
  const [activeVet, setActiveVet] = useState(null);
  
  // Booking State
  const [bookingVet, setBookingVet] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [myAppointments, setMyAppointments] = useState([]);

  // 1. Get User Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserLoc([p.coords.latitude, p.coords.longitude]),
        () => console.log("Location access denied. Using default.")
      );
    }
  }, []);

  // 2. Real-time Sync with Firestore for Appointments
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "appointments"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyAppointments(appts);
    });

    return () => unsubscribe();
  }, []);

  // 3. Filter and Sort Vets
  const filteredVets = useMemo(() => {
    return VETS.filter(v => {
      const dist = calculateDistance(userLoc[0], userLoc[1], v.lat, v.lng);
      if (isEmergency) return v.open === "24 Hours" && dist <= 10;
      return v.name.toLowerCase().includes(search.toLowerCase());
    })
    .map(v => ({ ...v, distance: calculateDistance(userLoc[0], userLoc[1], v.lat, v.lng) }))
    .sort((a, b) => a.distance - b.distance); // Sort by closest
  }, [search, userLoc, isEmergency]);

  // 4. Firebase Functions
  const confirmBooking = async () => {
    if (!auth.currentUser) return alert("Please log in to book!");

    try {
      await addDoc(collection(db, "appointments"), {
        userId: auth.currentUser.uid,
        vetName: bookingVet.name,
        date: selectedDate,
        time: selectedTime,
        service: selectedService,
        status: "Confirmed",
        createdAt: serverTimestamp()
      });

      setBookingVet(null);
      setSelectedTime("");
      setSelectedDate("");
      setSelectedService("");
      alert("Appointment secured! 🐾");
    } catch (error) {
      alert("Error booking: " + error.message);
    }
  };

  const cancelAppointment = async (id) => {
    if (window.confirm("Cancel this appointment?")) {
      await deleteDoc(doc(db, "appointments", id));
    }
  };

  return (
    <div className="vm-wrapper">
      <style>{`
        .vm-wrapper { font-family: 'Inter', sans-serif; height: 100vh; display: flex; flex-direction: column; background: #f8faf8; }
        .vm-nav { background: #2e7d32; color: white; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .vm-nav-btns button { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 18px; border-radius: 25px; cursor: pointer; margin-left: 10px; transition: 0.3s; }
        .vm-nav-btns button.active { background: white; color: #2e7d32; font-weight: bold; }
        
        .vm-main { display: flex; flex: 1; overflow: hidden; }
        .vm-sidebar { width: 380px; background: white; border-right: 1px solid #eee; display: flex; flex-direction: column; }
        .vm-search-pane { padding: 20px; background: #fff; border-bottom: 1px solid #eee; }
        .vm-list { flex: 1; overflow-y: auto; padding: 15px; }
        
        .vm-card { padding: 20px; border-radius: 16px; border: 1px solid #eee; margin-bottom: 15px; cursor: pointer; transition: 0.2s; position: relative; }
        .vm-card:hover { border-color: #2e7d32; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .vm-card.active { border-left: 5px solid #2e7d32; background: #f9fff9; }
        
        .vm-btn-book { width: 100%; background: #2e7d32; color: white; padding: 12px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; margin-top: 12px; }
        .vm-emergency-btn { width: 100%; padding: 12px; border-radius: 10px; font-weight: 800; cursor: pointer; margin-bottom: 15px; transition: 0.3s; }

        .vm-dashboard { flex: 1; padding: 40px; overflow-y: auto; }
        .vm-appt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .vm-appt-card { background: white; padding: 25px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.04); position: relative; }
        .vm-badge { position: absolute; top: 20px; right: 20px; background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; }

        .vm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(5px); }
        .vm-modal { background: white; width: 90%; max-width: 420px; padding: 30px; border-radius: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        
        .vm-time-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
        .vm-time-chip { padding: 10px; border: 1px solid #eee; border-radius: 10px; text-align: center; cursor: pointer; font-size: 0.85rem; }
        .vm-time-chip.selected { background: #2e7d32; color: white; border-color: #2e7d32; }

        @media(max-width: 900px) { .vm-main { flex-direction: column; } .vm-sidebar { width: 100%; height: 40%; } }
      `}</style>

      <nav className="vm-nav">
        <h2 style={{margin:0}}>🐾 VetAdopt</h2>
        <div className="vm-nav-btns">
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>📍 Map View</button>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>📅 My Visits ({myAppointments.length})</button>
        </div>
      </nav>

      <div className="vm-main">
        {view === "map" ? (
          <>
            <aside className="vm-sidebar">
              <div className="vm-search-pane">
                <button 
                  className="vm-emergency-btn" 
                  style={{ 
                    background: isEmergency ? '#d32f2f' : '#fff', 
                    color: isEmergency ? '#fff' : '#d32f2f',
                    border: '2px solid #d32f2f'
                  }}
                  onClick={() => setIsEmergency(!isEmergency)}
                >
                  {isEmergency ? "🚨 Emergency Mode Active" : "🆘 Emergency? Find 24/7 Vets"}
                </button>
                {!isEmergency && (
                  <input 
                    style={{width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid #eee', boxSizing:'border-box'}} 
                    placeholder="Search by clinic name..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                  />
                )}
              </div>
              <div className="vm-list">
                {filteredVets.map(v => (
                  <div key={v.id} className={`vm-card ${activeVet?.id === v.id ? 'active' : ''}`} onClick={() => setActiveVet(v)}>
                    <h4 style={{margin:0}}>{v.name}</h4>
                    <p style={{fontSize:'0.85rem', color:'#666', margin:'5px 0'}}>📍 {v.distance}km away • {v.open}</p>
                    <button className="vm-btn-book" onClick={(e) => { e.stopPropagation(); setBookingVet(v); }}>Book Appointment</button>
                  </div>
                ))}
              </div>
            </aside>

            <div style={{flex:1, position:'relative'}}>
              <MapContainer center={userLoc} zoom={14} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {filteredVets.map(v => (
                  <Marker key={v.id} position={[v.lat, v.lng]} icon={vetIcon} eventHandlers={{ click: () => setActiveVet(v) }}>
                    <Popup>
                      <div style={{textAlign:'center'}}>
                        <strong style={{color:'#2e7d32'}}>{v.name}</strong><br/>
                        <p style={{fontSize:'0.8rem', margin:'5px 0'}}>{v.address}</p>
                        <button onClick={() => setBookingVet(v)} style={{background:'#2e7d32', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>Book Now</button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {activeVet && <MapController center={[activeVet.lat, activeVet.lng]} />}
              </MapContainer>
            </div>
          </>
        ) : (
          <div className="vm-dashboard">
            <h1 style={{marginTop:0, color:'#1b5e20'}}>My Scheduled Visits</h1>
            <div className="vm-appt-grid">
              {myAppointments.map(appt => (
                <div key={appt.id} className="vm-appt-card">
                  <span className="vm-badge">{appt.status}</span>
                  <h3 style={{margin:0, color:'#2e7d32'}}>{appt.vetName}</h3>
                  <p style={{margin:'15px 0 8px', fontWeight:600}}>🏷️ {appt.service}</p>
                  <p style={{margin:0, fontSize:'0.9rem', color:'#666'}}>📅 {appt.date} | ⏰ {appt.time}</p>
                  <button 
                    onClick={() => cancelAppointment(appt.id)} 
                    style={{marginTop:20, background:'none', border:'none', color:'#d32f2f', fontWeight:'bold', cursor:'pointer', padding:0}}
                  >
                    Cancel This Visit
                  </button>
                </div>
              ))}
              {myAppointments.length === 0 && (
                <div style={{gridColumn:'1/-1', textAlign:'center', padding:'50px', background:'#fff', borderRadius:'20px'}}>
                  <h3>No appointments yet.</h3>
                  <button onClick={() => setView("map")} className="vm-btn-book" style={{width:'auto', padding:'10px 30px'}}>Find a Vet</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOOKING MODAL */}
      {bookingVet && (
        <div className="vm-modal-overlay">
          <div className="vm-modal">
            <h2 style={{marginTop:0, color:'#2e7d32'}}>Schedule Visit</h2>
            <p style={{color:'#666', marginBottom:20}}>Booking at <b>{bookingVet.name}</b></p>
            
            <label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#2e7d32'}}>SERVICE TYPE</label>
            <select style={{width:'100%', padding:'12px', margin:'8px 0 20px', borderRadius:'10px', border:'1px solid #eee'}} value={selectedService} onChange={e => setSelectedService(e.target.value)}>
              <option value="">-- Choose a Service --</option>
              <option value="General Checkup">General Checkup</option>
              <option value="Vaccination">Vaccination</option>
              <option value="Surgery / Grooming">Surgery / Grooming</option>
            </select>

            <label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#2e7d32'}}>DATE</label>
            <input type="date" style={{width:'100%', padding:'12px', margin:'8px 0 20px', borderRadius:'10px', border:'1px solid #eee'}} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />

            <label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#2e7d32'}}>AVAILABLE TIMES</label>
            <div className="vm-time-grid">
              {["09:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"].map(t => (
                <div key={t} className={`vm-time-chip ${selectedTime === t ? 'selected' : ''}`} onClick={() => setSelectedTime(t)}>{t}</div>
              ))}
            </div>

            <button className="vm-btn-book" style={{marginTop:30}} disabled={!selectedTime || !selectedDate || !selectedService} onClick={confirmBooking}>
              Confirm Appointment
            </button>
            <button style={{width:'100%', background:'none', border:'none', marginTop:15, cursor:'pointer', color:'#999'}} onClick={() => setBookingVet(null)}>Go Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VetMap;