import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
};

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 16); }, [center, map]);
  return null;
}

function VetMap() {
  const [view, setView] = useState("map"); // "map" or "appointments"
  const [search, setSearch] = useState("");
  const [maxDist, setMaxDist] = useState(10);
  const [isEmergency, setIsEmergency] = useState(false);
  const [userLoc, setUserLoc] = useState([10.3157, 123.8854]);
  const [activeVet, setActiveVet] = useState(null);
  
  // Booking & Dashboard State
  const [bookingVet, setBookingVet] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [myAppointments, setMyAppointments] = useState([
    { id: 101, vetName: "Cebu Happy Paws", date: "2026-02-15", time: "10:30 AM", service: "Vaccination", status: "Confirmed" }
  ]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => setUserLoc([p.coords.latitude, p.coords.longitude]));
    }
  }, []);

  const filteredVets = useMemo(() => {
    return VETS.filter(v => {
      const dist = calculateDistance(userLoc[0], userLoc[1], v.lat, v.lng);
      if (isEmergency) return v.open === "24 Hours" && dist <= 5;
      return v.name.toLowerCase().includes(search.toLowerCase()) && dist <= maxDist;
    }).map(v => ({ ...v, distance: calculateDistance(userLoc[0], userLoc[1], v.lat, v.lng) }));
  }, [search, maxDist, userLoc, isEmergency]);

  const confirmBooking = () => {
    const newAppt = {
      id: Date.now(),
      vetName: bookingVet.name,
      date: selectedDate,
      time: selectedTime,
      service: selectedService,
      status: "Pending"
    };
    setMyAppointments([...myAppointments, newAppt]);
    setBookingVet(null);
    setSelectedTime("");
    setSelectedDate("");
    setSelectedService("");
    alert("Appointment successfully added to your dashboard!");
  };

  const cancelAppointment = (id) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      setMyAppointments(myAppointments.filter(a => a.id !== id));
    }
  };

  return (
    <div className="vet-map-container">
      <style>{`
        .vet-map-container { font-family: 'Inter', sans-serif; height: 100vh; display: flex; flex-direction: column; background: #f4f7f4; }
        .nav-bar { background: #2e7d32; color: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
        .nav-links button { background: none; border: 1px solid white; color: white; padding: 6px 15px; border-radius: 20px; cursor: pointer; margin-left: 10px; font-weight: 500; }
        .nav-links button.active { background: white; color: #2e7d32; }
        
        .main-layout { display: flex; flex: 1; overflow: hidden; }
        .sidebar { width: 380px; background: #fff; border-right: 1px solid #eee; display: flex; flex-direction: column; }
        .search-area { padding: 20px; border-bottom: 1px solid #eee; background: #fafafa; }
        .vet-list { flex: 1; overflow-y: auto; padding: 15px; }
        .vet-card { padding: 18px; border: 1px solid #eee; border-radius: 16px; margin-bottom: 15px; cursor: pointer; }
        .book-btn { width: 100%; background: #2e7d32; color: white; padding: 10px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; margin-top: 10px; }
        
        .dashboard-container { flex: 1; padding: 40px; overflow-y: auto; background: #f8faf8; }
        .appt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .appt-card { background: white; padding: 20px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid #2e7d32; }
        .status-badge { font-size: 0.7rem; padding: 4px 10px; border-radius: 10px; background: #e8f5e9; color: #2e7d32; font-weight: bold; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(4px); }
        .booking-modal { background: white; width: 90%; max-width: 400px; padding: 30px; border-radius: 24px; }
        .time-chips { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
        .time-chip { padding: 10px; border: 1px solid #ddd; border-radius: 8px; text-align: center; cursor: pointer; font-size: 0.9rem; }
        .time-chip.active { background: #2e7d32; color: white; border-color: #2e7d32; }

        @media(max-width: 768px) { .main-layout { flex-direction: column; } .sidebar { width: 100%; height: 50%; } }
      `}</style>

      <nav className="nav-bar">
        <h2 style={{margin:0}}>VetAdopt</h2>
        <div className="nav-links">
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>📍 Map View</button>
          <button className={view === "appointments" ? "active" : ""} onClick={() => setView("appointments")}>📅 My Appointments ({myAppointments.length})</button>
        </div>
      </nav>

      <div className="main-layout">
        {view === "map" ? (
          <>
            <aside className="sidebar">
              <div className="search-area">
                <button className="book-btn" style={{background: isEmergency ? '#d32f2f' : '#fff', color: isEmergency ? '#fff' : '#d32f2f', border: '1px solid #d32f2f', marginBottom: 15}} onClick={() => setIsEmergency(!isEmergency)}>
                  {isEmergency ? "🚨 Emergency Mode On" : "🆘 Need Help Fast?"}
                </button>
                {!isEmergency && <input style={{width:'100%', padding:12, borderRadius:10, border:'1px solid #ddd', boxSizing:'border-box'}} placeholder="Search clinics..." value={search} onChange={e => setSearch(e.target.value)} />}
              </div>
              <div className="vet-list">
                {filteredVets.map(v => (
                  <div key={v.id} className="vet-card" onClick={() => setActiveVet(v)}>
                    <h4 style={{margin:0}}>{v.name}</h4>
                    <p style={{fontSize:'0.8rem', color:'#666'}}>{v.distance}km away • {v.open}</p>
                    <button className="book-btn" onClick={(e) => { e.stopPropagation(); setBookingVet(v); }}>Book Visit</button>
                  </div>
                ))}
              </div>
            </aside>
            <div style={{flex:1}}>
              <MapContainer center={userLoc} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {filteredVets.map(v => (
                  <Marker key={v.id} position={[v.lat, v.lng]} icon={vetIcon} eventHandlers={{ click: () => setActiveVet(v) }}>
                    <Popup>
                      <b>{v.name}</b><br/>
                      <button onClick={() => setBookingVet(v)} style={{marginTop:5, cursor:'pointer'}}>Book Now</button>
                    </Popup>
                  </Marker>
                ))}
                {activeVet && <MapController center={[activeVet.lat, activeVet.lng]} />}
              </MapContainer>
            </div>
          </>
        ) : (
          <div className="dashboard-container">
            <h1 style={{marginTop:0}}>Upcoming Appointments</h1>
            <div className="appt-grid">
              {myAppointments.map(appt => (
                <div key={appt.id} className="appt-card">
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <h3 style={{margin:0, color:'#2e7d32'}}>{appt.vetName}</h3>
                    <span className="status-badge">{appt.status}</span>
                  </div>
                  <p style={{margin:'15px 0 5px'}}><b>Service:</b> {appt.service}</p>
                  <p style={{margin:'0 0 15px', fontSize:'0.9rem', color:'#555'}}>📅 {appt.date} | ⏰ {appt.time}</p>
                  <button onClick={() => cancelAppointment(appt.id)} style={{background:'none', border:'none', color:'#d32f2f', padding:0, cursor:'pointer', fontWeight:'bold', fontSize:'0.85rem'}}>Cancel Appointment</button>
                </div>
              ))}
              {myAppointments.length === 0 && <p>You have no scheduled appointments.</p>}
            </div>
          </div>
        )}
      </div>

      {/* BOOKING MODAL */}
      {bookingVet && (
        <div className="modal-overlay">
          <div className="booking-modal">
            <h3 style={{marginTop:0}}>Schedule with {bookingVet.name}</h3>
            <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Select Service</label>
            <select style={{width:'100%', padding:10, margin:'5px 0 15px', borderRadius:8}} value={selectedService} onChange={e => setSelectedService(e.target.value)}>
              <option value="">-- Choose --</option>
              <option value="General Checkup">General Checkup</option>
              <option value="Vaccination">Vaccination</option>
              <option value="Anti-Rabies">Anti-Rabies Shot</option>
            </select>

            <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Select Date</label>
            <input type="date" style={{width:'100%', padding:10, margin:'5px 0 15px', borderRadius:8}} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />

            <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Select Time</label>
            <div className="time-chips">
              {["09:00 AM", "11:00 AM", "02:00 PM", "04:30 PM"].map(t => (
                <div key={t} className={`time-chip ${selectedTime === t ? 'active' : ''}`} onClick={() => setSelectedTime(t)}>{t}</div>
              ))}
            </div>

            <button className="book-btn" disabled={!selectedTime || !selectedDate || !selectedService} onClick={confirmBooking}>Confirm Appointment</button>
            <button style={{width:'100%', background:'none', border:'none', marginTop:10, cursor:'pointer', color:'#666'}} onClick={() => setBookingVet(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VetMap;