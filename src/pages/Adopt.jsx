import { useState, useMemo, useEffect, useRef } from "react";
import { db, auth } from "../Firebase";
import { collection, addDoc, onSnapshot, query, serverTimestamp } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

const TYPE_ICONS = { All: "🐾", Dog: "🐶", Cat: "🐱", Rabbit: "🐰", Parrot: "🦜", Bird: "🦜" };
const BADGE_COLORS = { 
  New: { bg: "#e8f5e9", text: "#2e7d32" }, 
  Puppy: { bg: "#fff8e1", text: "#f57f17" },
  Kitten: { bg: "#fff8e1", text: "#f57f17" } 
};

// Default fallback image if pet photo/image is missing, empty, or fails to load
const DEFAULT_PET_IMAGE = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=500&q=80";

// ─── Component Embedded Styles ────────────────────────────────────────────────
const EmbeddedStyles = () => (
  <style>{`
    .adopt-root {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a202c;
      box-sizing: border-box;
    }

    .adopt-root * {
      box-sizing: border-box;
    }

    /* Hero Section */
    .ad-hero {
      text-align: center;
      margin-bottom: 32px;
      padding: 40px 20px;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-radius: 16px;
      border: 1px solid #bbf7d0;
    }

    .ad-hero h1 {
      font-size: 2.25rem;
      margin: 0 0 10px 0;
      color: #14532d;
    }

    .ad-hero h1 em {
      font-style: normal;
      color: #16a34a;
    }

    .ad-hero p {
      color: #4b5563;
      margin: 0 0 24px 0;
      font-size: 1rem;
    }

    .ad-hero-stats {
      display: flex;
      justify-content: center;
      gap: 40px;
    }

    .ad-stat-num {
      font-size: 1.75rem;
      font-weight: 800;
      color: #15803d;
    }

    .ad-stat-label {
      font-size: 0.85rem;
      color: #4b5563;
      font-weight: 500;
    }

    /* Layout Grid */
    .ad-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 32px;
    }

    @media (max-width: 850px) {
      .ad-layout {
        grid-template-columns: 1fr;
      }
    }

    /* Sidebar Filter Panel */
    .ad-sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .side-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .side-card h3 {
      font-size: 1.1rem;
      margin-top: 0;
      margin-bottom: 16px;
      color: #0f172a;
    }

    .side-card h4 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin: 16px 0 8px 0;
    }

    .sidebar-filter {
      display: block;
      width: 100%;
      text-align: left;
      padding: 10px 14px;
      margin-bottom: 6px;
      border: 1px solid transparent;
      background: #f8fafc;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      color: #334155;
      transition: all 0.2s ease;
    }

    .sidebar-filter.active,
    .sidebar-filter:hover {
      background: #dcfce7;
      color: #14532d;
      border-color: #86efac;
    }

    .reset-btn {
      width: 100%;
      margin-top: 16px;
      padding: 10px;
      background: none;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      cursor: pointer;
      color: #64748b;
      font-weight: 600;
    }

    .reset-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Search & Controls Header */
    .ad-controls {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .ad-search-wrap {
      position: relative;
      flex: 1;
    }

    .ad-search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
    }

    .ad-search {
      width: 100%;
      padding: 12px 14px 12px 40px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 0.95rem;
      outline: none;
    }

    .ad-search:focus {
      border-color: #16a34a;
    }

    .ad-sort {
      padding: 0 16px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: white;
      font-size: 0.9rem;
      outline: none;
      cursor: pointer;
    }

    /* Species Section Containers */
    .ad-category-section {
      margin-bottom: 40px;
    }

    .ad-category-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ad-category-count {
      font-size: 0.9rem;
      font-weight: 500;
      color: #64748b;
    }

    /* Pet Cards Grid */
    .ad-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 24px;
    }

    .pc-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .pc-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .pc-img-wrap {
      position: relative;
      height: 220px;
      background: #f1f5f9;
      cursor: pointer;
      overflow: hidden;
    }

    .pc-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .pc-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .pc-zoom-hint {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 0.7rem;
      padding: 4px 8px;
      border-radius: 6px;
      backdrop-filter: blur(2px);
    }

    .pc-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .pc-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.8rem;
      color: #64748b;
      margin-bottom: 8px;
    }

    .pc-name {
      margin: 0 0 6px 0;
      font-size: 1.25rem;
      color: #0f172a;
    }

    .pc-desc {
      font-size: 0.875rem;
      color: #475569;
      margin: 0 0 16px 0;
      line-height: 1.4;
      flex: 1;
    }

    .pc-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }

    .pc-tag-chip {
      background: #f1f5f9;
      color: #475569;
      font-size: 0.75rem;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .pc-adopt-btn {
      width: 100%;
      padding: 12px;
      background: #15803d;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .pc-adopt-btn:hover {
      background: #166534;
    }

    /* Modal Controls & Overlay */
    .ad-modal-overlay,
    .ad-zoom-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
    }

    .ad-modal {
      background: white;
      border-radius: 16px;
      max-width: 520px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 28px;
      position: relative;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .ad-modal-close {
      position: absolute;
      top: 20px;
      right: 20px;
      border: none;
      background: #f1f5f9;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .ad-modal h2 {
      margin-top: 0;
      margin-bottom: 4px;
      color: #0f172a;
    }

    .ad-modal-sub {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 20px;
    }

    .ad-modal-pet-strip {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 10px;
      margin-bottom: 20px;
      border: 1px solid #e2e8f0;
    }

    .ad-modal-pet-img {
      width: 52px;
      height: 52px;
      border-radius: 8px;
      object-fit: cover;
    }

    .ad-modal-pet-name {
      font-weight: bold;
      color: #0f172a;
    }

    .ad-modal-pet-type {
      font-size: 0.8rem;
      color: #64748b;
    }

    .ad-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .ad-form-full {
      grid-column: span 2;
    }

    .ad-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 6px;
      color: #334155;
    }

    .ad-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 0.9rem;
      outline: none;
    }

    .ad-input:focus {
      border-color: #16a34a;
    }

    .ad-submit-btn {
      width: 100%;
      padding: 14px;
      background: #15803d;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      margin-top: 16px;
    }

    .ad-submit-btn:hover {
      background: #166534;
    }

    .ad-switch {
      text-align: center;
      margin-top: 16px;
      font-size: 0.85rem;
      color: #64748b;
    }

    .ad-switch span {
      color: #15803d;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
    }

    .ad-error {
      color: #dc2626;
      background: #fef2f2;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      margin-top: 10px;
    }

    .ad-zoom-img {
      max-width: 90vw;
      max-height: 85vh;
      border-radius: 12px;
      object-fit: contain;
    }

    .ad-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: #64748b;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px dashed #cbd5e1;
    }

    .ad-success {
      text-align: center;
      padding: 20px 0;
    }

    .ad-success-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 12px;
    }
  `}</style>
);

// Helper function to resolve pet image source across database schemas
const getPetImgUrl = (pet) => pet.image || pet.photo || pet.imageUrl || "";

// ─── Sub-components ────────────────────────────────────────────────────────────
function PetCard({ pet, onAdopt, onZoom }) {
  const ref = useRef(null);
  const rawImage = getPetImgUrl(pet);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [rawImage]);

  const displayImage = !imgError && rawImage ? rawImage : DEFAULT_PET_IMAGE;

  useEffect(() => {
    const el = ref.current;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.classList.add("visible"); }, 
      { threshold: 0.1 }
    );
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <article ref={ref} className="pc-card">
      <div className="pc-img-wrap" onClick={() => onZoom(displayImage)}>
        <img 
          src={displayImage} 
          alt={pet.name || "Pet"} 
          onError={() => setImgError(true)} 
        />
        {pet.badge && (
          <span className="pc-badge" style={{ background: BADGE_COLORS[pet.badge]?.bg || "#e8f5e9", color: BADGE_COLORS[pet.badge]?.text || "#2e7d32" }}>
            {pet.badge}
          </span>
        )}
        <div className="pc-zoom-hint">🔍 Tap to inspect</div>
      </div>
      <div className="pc-body">
        <div className="pc-meta">
          {pet.breed && <span>🏷️ {pet.breed}</span>}
          {pet.gender && <span>• {pet.gender}</span>}
          {pet.age && <span>• 🕐 {pet.age} {typeof pet.age === "number" ? (pet.age === 1 ? "year old" : "years old") : ""}</span>}
        </div>
        <h3 className="pc-name">{pet.name}</h3>
        <p className="pc-desc">{pet.description || "Looking for a loving home!"}</p>
        
        {pet.tags && pet.tags.length > 0 && (
          <div className="pc-tags">
            {pet.tags.map((tag, i) => (
              <span key={i} className="pc-tag-chip">{tag}</span>
            ))}
          </div>
        )}

        <button className="pc-adopt-btn" onClick={() => onAdopt(pet)}>
          Adopt {pet.name} →
        </button>
      </div>
    </article>
  );
}

function ModalInput({ type = "text", placeholder, value, onChange, rows, options }) {
  if (options) {
    return (
      <select className="ad-input" value={value} onChange={onChange}>
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  const Tag = rows ? "textarea" : "input";
  return (
    <Tag
      className="ad-input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
    />
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Adopt() {
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedPet, setSelectedPet] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modalStep, setModalStep] = useState("login");
  const [sort, setSort] = useState("default");
  const [ageFilter, setAgeFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  
  const [authData, setAuthData] = useState({ name: "", email: "", password: "" });
  const [contactData, setContactData] = useState({
    fullName: "",
    age: "",
    address: "",
    occupation: "",
    phone: "",
    houseType: "House (Owned)",
    petExperience: "Beginner",
    reason: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // 1. Fetch Real Pets from Firestore & map species to type
  useEffect(() => {
    const q = query(collection(db, "pets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPets = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          type: data.type || data.species || "Other"
        };
      });
      setPets(fetchedPets);
      setPetsLoading(false);
    }, (err) => {
      console.error("Error fetching pets from Firestore:", err);
      setPetsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setIsLoggedIn(!!u));
    return unsub;
  }, []);

  const getAgeInMonths = (ageStr) => {
    if (!ageStr) return 0;
    const value = parseInt(ageStr) || 0;
    if (String(ageStr).toLowerCase().includes("year")) return value * 12;
    return value;
  };

  const filteredPets = useMemo(() => {
    return pets.filter((p) => {
      const q = search.toLowerCase();

      const matchesSearch =
        (p.name?.toLowerCase() || "").includes(q) ||
        (p.type?.toLowerCase() || "").includes(q) ||
        (p.breed?.toLowerCase() || "").includes(q) ||
        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(q)));

      const matchesFilter = filter === "All" || p.type === filter;
      const matchesGender = genderFilter === "All" || p.gender === genderFilter;

      const ageInMonths = getAgeInMonths(p.age);
      let matchesAge = true;
      if (ageFilter === "Baby") matchesAge = ageInMonths <= 6;
      if (ageFilter === "Young") matchesAge = ageInMonths > 6 && ageInMonths <= 24;
      if (ageFilter === "Adult") matchesAge = ageInMonths > 24 && ageInMonths <= 84;
      if (ageFilter === "Senior") matchesAge = ageInMonths > 84;

      return matchesSearch && matchesFilter && matchesGender && matchesAge;
    });
  }, [pets, search, filter, ageFilter, genderFilter]);

  const sortedPets = useMemo(() => {
    const result = [...filteredPets];
    switch (sort) {
      case "name":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "youngest":
        result.sort((a, b) => getAgeInMonths(a.age) - getAgeInMonths(b.age));
        break;
      case "oldest":
        result.sort((a, b) => getAgeInMonths(b.age) - getAgeInMonths(a.age));
        break;
      default:
        break;
    }
    return result;
  }, [filteredPets, sort]);

  // Group pets by species category
  const categorizedPets = useMemo(() => {
    const categories = {
      Dog: [],
      Cat: [],
      Rabbit: [],
      Bird: [],
      Other: [],
    };

    sortedPets.forEach((pet) => {
      const type = pet.type;
      if (type === "Dog") categories.Dog.push(pet);
      else if (type === "Cat") categories.Cat.push(pet);
      else if (type === "Rabbit") categories.Rabbit.push(pet);
      else if (type === "Parrot" || type === "Bird") categories.Bird.push(pet);
      else categories.Other.push(pet);
    });

    return categories;
  }, [sortedPets]);

  const openAdopt = (pet) => {
    setSelectedPet(pet);
    setAuthError("");
    setModalStep(isLoggedIn ? "adopt" : "login");
  };

  const closeModal = () => {
    setSelectedPet(null);
    setContactData({
      fullName: "",
      age: "",
      address: "",
      occupation: "",
      phone: "",
      houseType: "House (Owned)",
      petExperience: "Beginner",
      reason: "",
    });
    setAuthData({ name: "", email: "", password: "" });
    setAuthError("");
  };

  const handleAuth = async (type) => {
    if (!authData.email || !authData.password) { 
      setAuthError("Please fill in all required authentication fields."); 
      return; 
    }
    setLoading(true);
    setAuthError("");
    try {
      if (type === "register") {
        if (!authData.name.trim()) { 
          setAuthError("Full name is required."); 
          setLoading(false); 
          return; 
        }
        const res = await createUserWithEmailAndPassword(auth, authData.email, authData.password);
        await updateProfile(res.user, { displayName: authData.name });
      } else {
        await signInWithEmailAndPassword(auth, authData.email, authData.password);
      }
      setModalStep("adopt");
    } catch (err) {
      setAuthError(
        err.code === "auth/wrong-password" 
          ? "Incorrect password." 
          : err.code === "auth/user-not-found" 
          ? "No account found with this email." 
          : err.message 
      );
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!contactData.fullName || !contactData.phone || !contactData.address) {
      setAuthError("Please fill in all basic contact fields (Name, Phone, Address).");
      return;
    }

    setLoading(true);
    setAuthError("");

    try {
      await addDoc(collection(db, "applications"), {
        petId: selectedPet.id,
        petName: selectedPet.name,
        petType: selectedPet.type,
        userId: auth.currentUser.uid,
        fullName: contactData.fullName,
        age: contactData.age,
        address: contactData.address,
        occupation: contactData.occupation,
        phone: contactData.phone,
        email: auth.currentUser.email,
        houseType: contactData.houseType,
        petExperience: contactData.petExperience,
        reason: contactData.reason,
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: auth.currentUser.uid,
        text: `Your adoption application for ${selectedPet.name} has been submitted successfully.`,
        createdAt: serverTimestamp(),
      });

      setModalStep("success");
    } catch (err) {
      console.error("Firestore Error:", err);
      setAuthError("Failed to submit application. " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="adopt-root">
      <EmbeddedStyles />

      {/* Hero Header */}
      <section className="ad-hero">
        <h1>Find Your <em>Forever</em> Companion</h1>
        <p>Every pet listed here is rescued, microchipped, fully vaccinated, and ready for adoption.</p>
        <div className="ad-hero-stats">
          <div className="ad-stat">
            <div className="ad-stat-num">{pets.length}</div>
            <div className="ad-stat-label">Available Pets</div>
          </div>
          <div className="ad-stat">
            <div className="ad-stat-num">100%</div>
            <div className="ad-stat-label">Rescued</div>
          </div>
        </div>
      </section>

      <div className="ad-layout">
        {/* Sidebar */}
        <aside className="ad-sidebar">
          <div className="side-card">
            <h3>🐾 Find Your Perfect Pet</h3>

            <h4>Species</h4>
            {Object.keys(TYPE_ICONS).map((cat) => (
              <button
                key={cat}
                className={`sidebar-filter ${filter === cat ? "active" : ""}`}
                onClick={() => setFilter(cat)}
              >
                {TYPE_ICONS[cat]} {cat === "All" ? "All Pets" : `${cat}s`}
              </button>
            ))}

            <h4>Age</h4>
            {["All", "Baby", "Young", "Adult", "Senior"].map((age) => (
              <button
                key={age}
                className={`sidebar-filter ${ageFilter === age ? "active" : ""}`}
                onClick={() => setAgeFilter(age)}
              >
                {age}
              </button>
            ))}

            <h4>Gender</h4>
            {["All", "Male", "Female"].map((gender) => (
              <button
                key={gender}
                className={`sidebar-filter ${genderFilter === gender ? "active" : ""}`}
                onClick={() => setGenderFilter(gender)}
              >
                {gender}
              </button>
            ))}

            <button
              className="reset-btn"
              onClick={() => {
                setSearch("");
                setFilter("All");
                setAgeFilter("All");
                setGenderFilter("All");
                setSort("default");
              }}
            >
              ↺ Reset Filters
            </button>
          </div>

          <div className="side-card">
            <h3>📊 Available Pets</h3>
            <p style={{ margin: "6px 0", fontSize: "0.9rem" }}>🐶 Dogs: {pets.filter(p => p.type === "Dog").length}</p>
            <p style={{ margin: "6px 0", fontSize: "0.9rem" }}>🐱 Cats: {pets.filter(p => p.type === "Cat").length}</p>
            <p style={{ margin: "6px 0", fontSize: "0.9rem" }}>🐰 Rabbits: {pets.filter(p => p.type === "Rabbit").length}</p>
            <p style={{ margin: "6px 0", fontSize: "0.9rem" }}>🦜 Birds: {pets.filter(p => p.type === "Parrot" || p.type === "Bird").length}</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ad-main">
          {/* Controls */}
          <div className="ad-controls">
            <div className="ad-search-wrap">
              <span className="ad-search-icon">🔍</span>
              <input
                className="ad-search"
                placeholder="Search pets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="ad-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="default">Sort By</option>
              <option value="name">Name (A-Z)</option>
              <option value="youngest">Youngest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {/* Categorized Pet Sections */}
          {petsLoading ? (
            <div className="ad-empty">
              <p>Loading available pets...</p>
            </div>
          ) : sortedPets.length === 0 ? (
            <div className="ad-empty">
              <p>No pets found matching your criteria.</p>
            </div>
          ) : (
            Object.entries(categorizedPets).map(([category, petGroup]) => {
              if (petGroup.length === 0) return null;
              
              const icon = TYPE_ICONS[category] || "🐾";
              const title = category === "Other" ? "Other Species" : `${category}s`;

              return (
                <section key={category} className="ad-category-section">
                  <h2 className="ad-category-title">
                    <span>{icon} {title}</span>
                    <span className="ad-category-count">({petGroup.length})</span>
                  </h2>
                  <div className="ad-grid">
                    {petGroup.map((pet) => (
                      <PetCard
                        key={pet.id}
                        pet={pet}
                        onAdopt={openAdopt}
                        onZoom={setZoomImage}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </main>
      </div>

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div className="ad-zoom-overlay" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} className="ad-zoom-img" alt="Zoomed View" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Adoption Form / Auth Modal */}
      {selectedPet && (
        <div className="ad-modal-overlay" onClick={closeModal}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ad-modal-close" onClick={closeModal}>✕</button>

            {modalStep === "adopt" && (
              <div className="ad-modal-pet-strip">
                <img 
                  className="ad-modal-pet-img" 
                  src={getPetImgUrl(selectedPet) || DEFAULT_PET_IMAGE} 
                  alt={selectedPet.name} 
                  onError={(e) => { e.target.src = DEFAULT_PET_IMAGE; }} 
                />
                <div>
                  <div className="ad-modal-pet-name">{selectedPet.name}</div>
                  <div className="ad-modal-pet-type">{selectedPet.breed || selectedPet.type} {selectedPet.gender ? `· ${selectedPet.gender}` : ''} {selectedPet.age ? `· ${selectedPet.age}` : ''}</div>
                </div>
              </div>
            )}

            {!isLoggedIn && modalStep === "login" && (
              <>
                <h2>Welcome Back 👋</h2>
                <p className="ad-modal-sub">Log in to process your adoption application.</p>
                <label className="ad-label">Email Address</label>
                <ModalInput type="email" placeholder="you@example.com" value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} />
                <label className="ad-label">Password</label>
                <ModalInput type="password" placeholder="Enter password" value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} />
                {authError && <p className="ad-error">⚠️ {authError}</p>}
                <button className="ad-submit-btn" onClick={() => handleAuth("login")} disabled={loading}>
                  {loading ? "Logging in..." : "Continue with Login"}
                </button>
                <p className="ad-switch">Need an account? <span onClick={() => { setModalStep("register"); setAuthError(""); }}>Create one</span></p>
              </>
            )}

            {!isLoggedIn && modalStep === "register" && (
              <>
                <h2>Create Account 🐾</h2>
                <p className="ad-modal-sub">Register to file your official adoption request.</p>
                <label className="ad-label">Full Name</label>
                <ModalInput placeholder="Juan Dela Cruz" value={authData.name} onChange={(e) => setAuthData({ ...authData, name: e.target.value })} />
                <label className="ad-label">Email Address</label>
                <ModalInput type="email" placeholder="you@example.com" value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} />
                <label className="ad-label">Password</label>
                <ModalInput type="password" placeholder="Minimum 6 characters" value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} />
                {authError && <p className="ad-error">⚠️ {authError}</p>}
                <button className="ad-submit-btn" onClick={() => handleAuth("register")} disabled={loading}>
                  {loading ? "Registering..." : "Register Account"}
                </button>
                <p className="ad-switch">Already registered? <span onClick={() => { setModalStep("login"); setAuthError(""); }}>Log in</span></p>
              </>
            )}

            {modalStep === "adopt" && (
              <>
                <h2>Adoption Form</h2>
                <p className="ad-modal-sub">Please fill out this form for system validation and review.</p>

                <div className="ad-form-grid">
                  <div className="ad-form-full">
                    <label className="ad-label">Applicant Name</label>
                    <ModalInput placeholder="Juan Dela Cruz" value={contactData.fullName} onChange={(e) => setContactData({ ...contactData, fullName: e.target.value })} />
                  </div>
                  <div>
                    <label className="ad-label">Age</label>
                    <ModalInput type="number" placeholder="21" value={contactData.age} onChange={(e) => setContactData({ ...contactData, age: e.target.value })} />
                  </div>
                  <div>
                    <label className="ad-label">Occupation</label>
                    <ModalInput placeholder="Software Developer" value={contactData.occupation} onChange={(e) => setContactData({ ...contactData, occupation: e.target.value })} />
                  </div>
                  <div className="ad-form-full">
                    <label className="ad-label">Phone Number</label>
                    <ModalInput type="tel" placeholder="+63 900 000 0000" value={contactData.phone} onChange={(e) => setContactData({ ...contactData, phone: e.target.value })} />
                  </div>
                  <div className="ad-form-full">
                    <label className="ad-label">Complete Home Address</label>
                    <ModalInput placeholder="House No., Street, Barangay, City, Province" value={contactData.address} onChange={(e) => setContactData({ ...contactData, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="ad-label">Housing Type</label>
                    <ModalInput
                      value={contactData.houseType}
                      onChange={(e) => setContactData({ ...contactData, houseType: e.target.value })}
                      options={[
                        { label: "House (Owned)", value: "House (Owned)" },
                        { label: "House (Rented)", value: "House (Rented)" },
                        { label: "Apartment / Condo", value: "Apartment / Condo" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="ad-label">Pet Experience</label>
                    <ModalInput
                      value={contactData.petExperience}
                      onChange={(e) => setContactData({ ...contactData, petExperience: e.target.value })}
                      options={[
                        { label: "Beginner (First Time)", value: "Beginner" },
                        { label: "Intermediate (Had pets before)", value: "Intermediate" },
                        { label: "Experienced Owner", value: "Experienced" },
                      ]}
                    />
                  </div>
                  <div className="ad-form-full">
                    <label className="ad-label">Reason for Adoption</label>
                    <ModalInput rows={3} placeholder="Tell us why you want to adopt this pet..." value={contactData.reason} onChange={(e) => setContactData({ ...contactData, reason: e.target.value })} />
                  </div>
                </div>

                {authError && <p className="ad-error">⚠️ {authError}</p>}

                <button className="ad-submit-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? "Submitting Application..." : "Submit Application"}
                </button>
              </>
            )}

            {modalStep === "success" && (
              <div className="ad-success">
                <span className="ad-success-icon">🎉</span>
                <h2>Application Submitted!</h2>
                <p className="ad-modal-sub">Thank you for submitting your adoption application for {selectedPet.name}. We will review your application and get back to you soon.</p>
                <button className="ad-submit-btn" onClick={closeModal}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}