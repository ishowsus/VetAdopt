import { useEffect, useState } from "react";
import { auth, db } from "../../Firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM",
];

const EMPTY_AVAILABILITY = DAYS.reduce((acc, day) => ({ ...acc, [day]: [] }), {});

const EMPTY_PROFILE = {
  name: "",
  email: "",
  phone: "",
  clinicName: "",
  specialization: "",
  licenseNumber: "",
  experience: "",
  address: "",
  workingHours: "",
  lat: null,
  lng: null,
  availability: EMPTY_AVAILABILITY,
};

const FIELDS = [
  { key: "clinicName", label: "Clinic Name" },
  { key: "phone", label: "Phone Number" },
  { key: "specialization", label: "Specialization" },
  { key: "licenseNumber", label: "License Number" },
  { key: "experience", label: "Experience" },
  { key: "workingHours", label: "Working Hours" },
  { key: "address", label: "Address" },
];

function VetProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [draft, setDraft] = useState(EMPTY_PROFILE);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLoading(false);
          return;
        }

        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = {
            ...EMPTY_PROFILE,
            ...docSnap.data(),
            availability: {
              ...EMPTY_AVAILABILITY,
              ...(docSnap.data().availability || {}),
            },
          };
          setProfile(data);
          setDraft(data);
        } else {
          const fallback = {
            ...EMPTY_PROFILE,
            email: currentUser.email || "",
          };
          setProfile(fallback);
          setDraft(fallback);
        }
      } catch (err) {
        console.error(err);
        setError("Couldn't load your profile. Please try again.");
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleChange = (key) => (e) => {
    setDraft((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleEditClick = () => {
    setDraft(profile);
    setError("");
    setLocationError("");
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(profile);
    setError("");
    setLocationError("");
    setEditing(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported on this device/browser.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraft((prev) => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setLocating(false);
      },
      (err) => {
        console.warn("Geolocation warning:", err.message);
        if (err.code === 1) {
          setLocationError(
            "Location permission was blocked. Check your browser's site settings and allow location, or use manual coordinate inputs below."
          );
        } else if (err.code === 3) {
          setLocationError("Location request timed out. Please try again or use address lookup below.");
        } else if (!window.isSecureContext) {
          setLocationError(
            "Location access requires HTTPS or localhost. Use the manual lookup below instead."
          );
        } else {
          setLocationError("Couldn't get your location. Use 'Find on Map from Address' below instead.");
        }
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleFindByAddress = async () => {
    if (!draft.address || !draft.address.trim()) {
      setLocationError("Please enter your clinic address above first.");
      return;
    }
    setGeocoding(true);
    setLocationError("");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        draft.address
      )}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const results = await res.json();
      if (!results || results.length === 0) {
        setLocationError("Couldn't find that address. Try adding more detail or use manual coordinates.");
        setGeocoding(false);
        return;
      }
      setDraft((prev) => ({
        ...prev,
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      }));
    } catch (err) {
      console.error(err);
      setLocationError("Couldn't look up that address right now. Please try again.");
    }
    setGeocoding(false);
  };

  const handleManualCoord = (key) => (e) => {
    const val = e.target.value;
    setDraft((prev) => ({ ...prev, [key]: val === "" ? null : parseFloat(val) }));
  };

  const toggleSlot = (day, slot) => {
    setDraft((prev) => {
      const current = prev.availability[day] || [];
      const next = current.includes(slot)
        ? current.filter((s) => s !== slot)
        : [...current, slot];
      return {
        ...prev,
        availability: { ...prev.availability, [day]: next },
      };
    });
  };

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("You need to be signed in to save changes.");
      return;
    }

    if (draft.lat == null || draft.lng == null) {
      setError("Please set your clinic location before saving, so adopters can find you on the map.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const docRef = doc(db, "users", currentUser.uid);
      const payload = { ...draft, role: "vet" };
      await setDoc(docRef, payload, { merge: true });
      setProfile(payload);
      setEditing(false);
    } catch (err) {
      console.error(err);
      setError("Couldn't save your changes. Please check Firebase rules or try again.");
    }

    setSaving(false);
  };

  if (loading) {
    return <h2 style={{ textAlign: "center" }}>Loading...</h2>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img
            src="https://ui-avatars.com/api/?name=Veterinarian&background=2e7d32&color=fff&size=200"
            alt="Profile"
            style={styles.avatar}
          />
          <h2>{profile.name || "Veterinarian"}</h2>
          <p>{profile.email}</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.grid}>
          {FIELDS.map((field) =>
            editing ? (
              <EditableInfo
                key={field.key}
                title={field.label}
                value={draft[field.key]}
                onChange={handleChange(field.key)}
              />
            ) : (
              <Info key={field.key} title={field.label} value={profile[field.key]} />
            )
          )}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📍 Clinic Location</h3>
          <p style={styles.sectionSub}>
            This is the pin adopters see on the vet map. It must be set for your clinic to
            appear.
          </p>

          {profile.lat != null && profile.lng != null && !editing && (
            <p style={styles.locationText}>
              Location set ({profile.lat.toFixed(5)}, {profile.lng.toFixed(5)})
            </p>
          )}

          {editing && (
            <>
              <div style={styles.locationButtonRow}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={handleUseCurrentLocation}
                  disabled={locating || geocoding}
                >
                  {locating ? "Locating..." : "📌 Use My Current Location"}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={handleFindByAddress}
                  disabled={locating || geocoding}
                >
                  {geocoding ? "Looking up..." : "🔎 Find on Map from Address"}
                </button>
              </div>

              {draft.lat != null && draft.lng != null ? (
                <p style={styles.locationText}>
                  Location set ({draft.lat.toFixed(5)}, {draft.lng.toFixed(5)})
                </p>
              ) : (
                <p style={styles.locationTextMuted}>No location set yet.</p>
              )}
              {locationError && <p style={styles.inlineError}>{locationError}</p>}

              <div style={styles.manualCoordRow}>
                <div style={{ flex: 1 }}>
                  <h4 style={styles.infoBoxLabel}>Latitude (manual override)</h4>
                  <input
                    style={styles.input}
                    type="number"
                    step="any"
                    value={draft.lat ?? ""}
                    onChange={handleManualCoord("lat")}
                    placeholder="e.g. 10.31570"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={styles.infoBoxLabel}>Longitude (manual override)</h4>
                  <input
                    style={styles.input}
                    type="number"
                    step="any"
                    value={draft.lng ?? ""}
                    onChange={handleManualCoord("lng")}
                    placeholder="e.g. 123.88540"
                  />
                </div>
              </div>
              <p style={styles.sectionSub}>
                You can copy exact coordinates from Google Maps (right-click a spot → the
                numbers at the top) and paste them here if the buttons above don't work.
              </p>
            </>
          )}

          {profile.lat == null && !editing && (
            <p style={styles.locationTextMuted}>
              No location set yet — you won't appear on the map until you add one.
            </p>
          )}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🗓️ Weekly Availability</h3>
          <p style={styles.sectionSub}>
            Select the time slots you're available each day. Adopters can only book from these
            open slots.
          </p>

          <div style={styles.availabilityGrid}>
            {DAYS.map((day) => (
              <div key={day} style={styles.dayBlock}>
                <h4 style={styles.dayLabel}>{day}</h4>
                <div style={styles.slotRow}>
                  {TIME_SLOTS.map((slot) => {
                    const source = editing ? draft : profile;
                    const active = (source.availability?.[day] || []).includes(slot);
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => editing && toggleSlot(day, slot)}
                        disabled={!editing}
                        style={{
                          ...styles.slotChip,
                          ...(active ? styles.slotChipActive : {}),
                          cursor: editing ? "pointer" : "default",
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {editing ? (
          <div style={styles.buttonRow}>
            <button style={styles.secondaryButtonFull} onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button style={styles.button} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        ) : (
          <div style={{ padding: "0 30px 30px" }}>
            <button style={styles.button} onClick={handleEditClick}>
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ title, value }) {
  return (
    <div style={styles.infoBox}>
      <h4>{title}</h4>
      <p>{value || "Not Provided"}</p>
    </div>
  );
}

function EditableInfo({ title, value, onChange }) {
  return (
    <div style={styles.infoBox}>
      <h4 style={styles.infoBoxLabel}>{title}</h4>
      <input
        style={styles.input}
        value={value || ""}
        onChange={onChange}
        placeholder={title}
      />
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    background: "#f5f7fa",
    minHeight: "100vh",
  },

  card: {
    maxWidth: "900px",
    margin: "auto",
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,.1)",
    overflow: "hidden",
  },

  header: {
    background: "#2e7d32",
    color: "#fff",
    textAlign: "center",
    padding: "40px",
  },

  avatar: {
    width: "130px",
    height: "130px",
    borderRadius: "50%",
    border: "5px solid white",
    marginBottom: "15px",
  },

  errorBanner: {
    margin: "20px 30px 0",
    padding: "12px 16px",
    background: "#fdecea",
    color: "#b3261e",
    borderRadius: "10px",
    fontSize: "14px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
    gap: "20px",
    padding: "30px",
  },

  infoBox: {
    background: "#f8f9fa",
    padding: "20px",
    borderRadius: "12px",
    borderLeft: "5px solid #2e7d32",
  },

  infoBoxLabel: {
    margin: "0 0 8px",
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "15px",
    border: "1px solid #cfd8dc",
    borderRadius: "8px",
    boxSizing: "border-box",
    outline: "none",
  },

  section: {
    padding: "0 30px 30px",
  },

  sectionTitle: {
    margin: "0 0 6px",
    fontSize: "17px",
  },

  sectionSub: {
    margin: "0 0 16px",
    fontSize: "13px",
    color: "#607d8b",
  },

  locationText: {
    fontSize: "14px",
    color: "#2e7d32",
    fontWeight: 600,
    margin: "10px 0 0",
  },

  locationTextMuted: {
    fontSize: "14px",
    color: "#90a4ae",
    margin: "10px 0 0",
  },

  inlineError: {
    fontSize: "13px",
    color: "#b3261e",
    margin: "8px 0 0",
  },

  locationButtonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  manualCoordRow: {
    display: "flex",
    gap: "16px",
    marginTop: "14px",
    flexWrap: "wrap",
  },

  availabilityGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  dayBlock: {
    background: "#f8f9fa",
    borderRadius: "12px",
    padding: "14px 16px",
    borderLeft: "5px solid #2e7d32",
  },

  dayLabel: {
    margin: "0 0 10px",
    fontSize: "14px",
  },

  slotRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },

  slotChip: {
    padding: "7px 12px",
    borderRadius: "999px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#cfd8dc",
    background: "#fff",
    color: "#546e7a",
    fontSize: "12px",
    fontWeight: 600,
  },

  slotChipActive: {
    background: "#2e7d32",
    borderColor: "#2e7d32",
    color: "#fff",
  },

  buttonRow: {
    display: "flex",
    gap: "12px",
    margin: "0 30px 30px",
  },

  button: {
    flex: 1,
    padding: "14px",
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "12px 18px",
    background: "#fff",
    color: "#2e7d32",
    border: "2px solid #2e7d32",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  secondaryButtonFull: {
    flex: 1,
    padding: "14px",
    background: "#fff",
    color: "#2e7d32",
    border: "2px solid #2e7d32",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default VetProfile;