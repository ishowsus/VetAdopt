import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Sample Cebu vet data
const vets = [
  { id: 1, name: "Cebu Happy Paws Vet Clinic", lat: 10.3157, lng: 123.8854, address: "123 Mango Ave, Cebu City", phone: "0917-123-4567" },
  { id: 2, name: "Furry Friends Vet Cebu", lat: 10.3170, lng: 123.8920, address: "456 Osmeña Blvd, Cebu City", phone: "0917-987-6543" },
  { id: 3, name: "Pawfect Care Vet Cebu", lat: 10.3190, lng: 123.8900, address: "789 Colon St, Cebu City", phone: "0922-555-1234" },
];

// Custom icon
const vetIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/616/616408.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Helper to calculate distance in km
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Map updater
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center]);
  return null;
}

function VetMap() {
  const [search, setSearch] = useState("");
  const [distanceFilter, setDistanceFilter] = useState(0); // km
  const [userLocation, setUserLocation] = useState([10.3157, 123.8854]); // default Cebu
  const [filteredVets, setFilteredVets] = useState(vets);
  const [selectedVet, setSelectedVet] = useState(null);

  // Get user location if allowed
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => console.log("Geolocation not allowed, using default Cebu location")
      );
    }
  }, []);

  // Filter vets by search & distance
  useEffect(() => {
    let result = vets;

    if (search) {
      result = result.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.address.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (distanceFilter > 0) {
      result = result.filter(v =>
        getDistance(userLocation[0], userLocation[1], v.lat, v.lng) <= distanceFilter
      );
    }

    setFilteredVets(result);
  }, [search, distanceFilter, userLocation]);

  return (
    <>
      <style>{`
        body { font-family: Arial, sans-serif; margin:0; padding:0; }
        .map-hero {
          height:35vh;
          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;
          text-align:center;
          color:white;
          background:linear-gradient(rgba(46,125,50,0.7), rgba(46,125,50,0.7)),
                     url("https://images.unsplash.com/photo-1583337130417-51b4a9de0913") center/cover no-repeat;
        }
        .map-hero h1 { font-size:3rem; margin-bottom:10px; }
        .map-hero p { font-size:1.2rem; max-width:700px; }

        .filters {
          max-width:1000px;
          margin:20px auto;
          display:flex;
          justify-content:center;
          gap:15px;
          flex-wrap:wrap;
        }
        .filters input, .filters select {
          padding:10px 15px;
          border-radius:8px;
          border:1px solid #ccc;
          font-size:1rem;
        }

        .map-container-wrapper {
          max-width:1000px;
          margin:20px auto;
          border-radius:16px;
          overflow:hidden;
          height:600px;
          box-shadow:0 8px 25px rgba(0,0,0,0.1);
        }

        .map-cta {
          background:#e8f5e9;
          padding:60px 20px;
          text-align:center;
          border-radius:12px;
          margin:60px 20px;
        }
        .map-cta h2 { color:#2e7d32; font-size:2rem; margin-bottom:15px; }
        .map-cta p { font-size:1.1rem; color:#444; margin-bottom:25px; }
        .map-cta button { padding:14px 32px; background:#2e7d32; color:white; border-radius:30px; font-size:1.1rem; transition: transform 0.3s, background 0.3s; }
        .map-cta button:hover { transform:scale(1.05); background:#1b5e20; }

        @media(max-width:768px){
          .map-hero h1{font-size:2.2rem;}
          .map-hero p{font-size:1rem;}
          .map-container-wrapper{height:400px;}
        }
      `}</style>

      {/* HERO */}
      <section className="map-hero">
        <h1>VetMap 🐾</h1>
        <p>Find nearby veterinary clinics in Cebu and schedule appointments directly through VetAdopt.</p>
      </section>

      {/* FILTERS */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by clinic or area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={distanceFilter} onChange={(e) => setDistanceFilter(Number(e.target.value))}>
          <option value={0}>All distances</option>
          <option value={1}>Within 1 km</option>
          <option value={2}>Within 2 km</option>
          <option value={5}>Within 5 km</option>
          <option value={10}>Within 10 km</option>
        </select>
      </div>

      {/* MAP */}
      <div className="map-container-wrapper">
        <MapContainer center={userLocation} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {filteredVets.map(vet => (
            <Marker
              key={vet.id}
              position={[vet.lat, vet.lng]}
              icon={vetIcon}
              eventHandlers={{ click: () => setSelectedVet(vet) }}
            >
              <Popup>
                <strong>{vet.name}</strong><br/>
                {vet.address}<br/>
                📞 {vet.phone}<br/>
                <button style={{ marginTop:"5px", padding:"5px 10px", borderRadius:"6px", background:"#2e7d32", color:"white", border:"none", cursor:"pointer" }}
                  onClick={() => alert(`Scheduling appointment for ${vet.name}`)}>
                  Schedule Appointment
                </button>
              </Popup>
            </Marker>
          ))}
          {selectedVet && <MapUpdater center={[selectedVet.lat, selectedVet.lng]} />}
        </MapContainer>
      </div>

      {/* CTA */}
      <section className="map-cta">
        <h2>Connect with Local Vets</h2>
        <p>Use the search and distance filters to find the perfect vet in Cebu. Click a pin to view details and schedule an appointment!</p>
        <button>Schedule an Appointment</button>
      </section>
    </>
  );
}

export default VetMap;
