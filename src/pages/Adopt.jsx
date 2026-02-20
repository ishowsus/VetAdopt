import { useState, useMemo, useEffect, useRef } from "react";
import { db, auth } from "../Firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

// ─── Data ─────────────────────────────────────────────────────────────────────
const PET_DATA = [
  { id: 1, name: "Buddy", type: "Dog", gender: "Male", age: "2 years", description: "Friendly and playful labrador mix who loves fetch and long walks on the beach.", image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600", badge: "New" },
  { id: 2, name: "Luna", type: "Dog", gender: "Female", age: "1 year", description: "Gentle, loving, and great with kids. Luna melts hearts wherever she goes.", image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=600", badge: "Puppy" },
  { id: 3, name: "Milo", type: "Cat", gender: "Male", age: "3 years", description: "A calm indoor cat who loves naps in sunbeams and quiet evenings.", image: "https://images.unsplash.com/photo-1514888286872-01d6d89f4c2e?auto=format&fit=crop&q=80&w=600", badge: "" },
  { id: 4, name: "Daisy", type: "Dog", gender: "Female", age: "4 months", description: "High energy puppy ready for training — she learns new tricks in minutes!", image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=600", badge: "Puppy" },
  { id: 5, name: "Coco", type: "Cat", gender: "Female", age: "2 years", description: "Curious, affectionate, and endlessly talkative. Coco will greet you at the door.", image: "https://images.unsplash.com/photo-1573865662567-57ef8424bd54?auto=format&fit=crop&q=80&w=600", badge: "New" },
  { id: 6, name: "Max", type: "Rabbit", gender: "Male", age: "1 year", description: "Soft, gentle, and loves carrots. Max is the perfect apartment companion.", image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&q=80&w=600", badge: "" },
  { id: 7, name: "Bella", type: "Dog", gender: "Female", age: "3 years", description: "Loyal, protective, and very smart. Bella was born to be someone's best friend.", image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=600", badge: "" },
  { id: 8, name: "Charlie", type: "Parrot", gender: "Male", age: "2 years", description: "Talkative parrot with vibrant feathers. Charlie will have you laughing every day.", image: "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?auto=format&fit=crop&q=80&w=600", badge: "New" },
];

const TYPE_ICONS = { All: "🐾", Dog: "🐶", Cat: "🐱", Rabbit: "🐰", Parrot: "🦜" };
const BADGE_COLORS = { New: { bg: "#e8f5e9", text: "#2e7d32" }, Puppy: { bg: "#fff8e1", text: "#f57f17" } };

// ─── Sub-components ────────────────────────────────────────────────────────────
function PetCard({ pet, onAdopt, onZoom, index }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.classList.add("visible"); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <article
      ref={ref}
      className="pc-card"
      style={{ transitionDelay: `${(index % 4) * 80}ms` }}
    >
      <div className="pc-img-wrap" onClick={() => onZoom(pet.image)}>
        <img src={pet.image} alt={pet.name} onError={(e) => { e.target.src = "https://placehold.co/600x400?text=Photo+Coming+Soon"; }} />
        {pet.badge && (
          <span className="pc-badge" style={{ background: BADGE_COLORS[pet.badge]?.bg, color: BADGE_COLORS[pet.badge]?.text }}>
            {pet.badge}
          </span>
        )}
        <div className="pc-zoom-hint">🔍 Tap to zoom</div>
      </div>
      <div className="pc-body">
        <div className="pc-meta">
          <span>{TYPE_ICONS[pet.type]} {pet.type}</span>
          <span>{pet.gender}</span>
          <span>🕐 {pet.age}</span>
        </div>
        <h3 className="pc-name">{pet.name}</h3>
        <p className="pc-desc">{pet.description}</p>
        <button className="pc-adopt-btn" onClick={() => onAdopt(pet)}>
          Adopt {pet.name} →
        </button>
      </div>
    </article>
  );
}

function ModalInput({ type = "text", placeholder, value, onChange, rows }) {
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

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Adopt() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedPet, setSelectedPet] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modalStep, setModalStep] = useState("login");
  const [authData, setAuthData] = useState({ name: "", email: "", password: "" });
  const [contactData, setContactData] = useState({ phone: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setIsLoggedIn(!!u));
    return unsub;
  }, []);

  const filteredPets = useMemo(() => {
    return PET_DATA.filter((p) => {
      const q = search.toLowerCase();
      return (
        (p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)) &&
        (filter === "All" || p.type === filter)
      );
    });
  }, [search, filter]);

  const openAdopt = (pet) => {
    setSelectedPet(pet);
    setAuthError("");
    setModalStep(isLoggedIn ? "adopt" : "login");
  };

  const closeModal = () => {
    setSelectedPet(null);
    setContactData({ phone: "", notes: "" });
    setAuthData({ name: "", email: "", password: "" });
    setAuthError("");
  };

  const handleAuth = async (type) => {
    if (!authData.email || !authData.password) { setAuthError("Please fill in all fields."); return; }
    setLoading(true);
    setAuthError("");
    try {
      if (type === "register") {
        if (!authData.name.trim()) { setAuthError("Name is required."); setLoading(false); return; }
        const res = await createUserWithEmailAndPassword(auth, authData.email, authData.password);
        await updateProfile(res.user, { displayName: authData.name });
      } else {
        await signInWithEmailAndPassword(auth, authData.email, authData.password);
      }
      setModalStep("adopt");
    } catch (err) {
      setAuthError(err.code === "auth/wrong-password" ? "Incorrect password." : err.code === "auth/user-not-found" ? "No account found." : err.message);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!contactData.phone.trim()) { setAuthError("Phone number is required."); return; }
    setLoading(true);
    setAuthError("");
    try {
      await addDoc(collection(db, "applications"), {
        petId: selectedPet.id,
        petName: selectedPet.name,
        petType: selectedPet.type,
        phone: contactData.phone,
        notes: contactData.notes,
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        status: "Pending",
        createdAt: serverTimestamp(),
      });
      setModalStep("success");
    } catch (err) { setAuthError(err.message); }
    setLoading(false);
  };

  return (
    <div className="adopt-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px) } to { opacity:1; transform:translateY(0) } }
        @keyframes popIn { from { opacity:0; transform:scale(0.88) } to { opacity:1; transform:scale(1) } }
        @keyframes heroIn { from { opacity:0; transform:translateY(-16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .adopt-root { font-family:'DM Sans',sans-serif; background:#f5f8f5; min-height:100vh; color:#1a2e1a; }

        /* ── Hero ── */
        .ad-hero {
          position:relative; min-height:460px; display:flex; flex-direction:column;
          align-items:center; justify-content:center; text-align:center;
          padding:100px 24px 130px; overflow:hidden;
          background: linear-gradient(160deg,#1b5e20 0%,#2e7d32 50%,#388e3c 100%);
        }
        .ad-hero-bg {
          position:absolute; inset:0;
          background: url('https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&q=60&w=1200') center/cover no-repeat;
          opacity:0.12;
        }
        .ad-hero-paws {
          position:absolute; font-size:12rem; opacity:0.04; right:-40px; bottom:-40px;
          line-height:1; pointer-events:none; transform:rotate(-15deg);
        }
        .ad-hero h1 {
          font-family:'Fraunces',serif; font-size:clamp(2.4rem,5vw,4rem); font-weight:900;
          color:white; line-height:1.1; margin-bottom:16px; position:relative;
          animation: heroIn 0.7s ease both;
        }
        .ad-hero h1 em { font-style:italic; color:#a5d6a7; }
        .ad-hero p {
          font-size:1.1rem; color:rgba(255,255,255,0.75); font-weight:500; position:relative;
          animation: heroIn 0.7s 0.15s ease both; max-width:500px;
        }
        .ad-hero-stats {
          display:flex; gap:40px; margin-top:32px; position:relative;
          animation: heroIn 0.7s 0.25s ease both;
        }
        .ad-stat { text-align:center; }
        .ad-stat-num { font-family:'Fraunces',serif; font-size:2rem; font-weight:900; color:white; line-height:1; }
        .ad-stat-label { font-size:0.72rem; color:rgba(255,255,255,0.6); font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin-top:2px; }

        /* ── Controls ── */
        .ad-controls {
          max-width:860px; margin:-52px auto 0; padding:28px 32px;
          background:white; border-radius:24px;
          box-shadow:0 24px 60px rgba(0,0,0,0.1); position:relative; z-index:10;
          animation: fadeUp 0.6s 0.2s ease both;
        }
        .ad-search-wrap { position:relative; margin-bottom:20px; }
        .ad-search-icon { position:absolute; left:16px; top:50%; transform:translateY(-50%); font-size:1.1rem; }
        .ad-search {
          width:100%; padding:14px 16px 14px 44px; border:2px solid #e8f0e8;
          border-radius:14px; font-size:0.95rem; font-family:'DM Sans',sans-serif;
          transition:border-color 0.2s; outline:none; color:#1a2e1a;
        }
        .ad-search:focus { border-color:#2e7d32; }
        .ad-chips { display:flex; gap:10px; flex-wrap:wrap; }
        .ad-chip {
          padding:9px 20px; border-radius:99px; border:2px solid #e8f0e8;
          background:white; color:#557055; font-weight:700; font-size:0.85rem;
          cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif;
          display:flex; align-items:center; gap:6px;
        }
        .ad-chip:hover { border-color:#81c784; background:#f1f8f1; }
        .ad-chip.active { background:#2e7d32; color:white; border-color:#2e7d32; box-shadow:0 4px 12px rgba(46,125,50,0.3); }

        /* ── Grid ── */
        .ad-grid {
          display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr));
          gap:28px; max-width:1200px; margin:48px auto; padding:0 24px;
        }
        .ad-empty { grid-column:1/-1; text-align:center; padding:64px; color:#9aaa9a; }
        .ad-empty-icon { font-size:3.5rem; margin-bottom:12px; }

        /* ── Pet Card ── */
        .pc-card {
          background:white; border-radius:24px; overflow:hidden;
          box-shadow:0 4px 16px rgba(0,0,0,0.06); transition:all 0.5s cubic-bezier(0.16,1,0.3,1);
          opacity:0; transform:translateY(36px);
        }
        .pc-card.visible { opacity:1; transform:translateY(0); }
        .pc-card:hover { transform:translateY(-10px); box-shadow:0 20px 48px rgba(0,0,0,0.12); }
        .pc-img-wrap {
          position:relative; height:230px; overflow:hidden; cursor:zoom-in;
        }
        .pc-img-wrap img { width:100%; height:100%; object-fit:cover; transition:transform 0.5s; }
        .pc-card:hover .pc-img-wrap img { transform:scale(1.07); }
        .pc-zoom-hint {
          position:absolute; inset:0; background:rgba(0,0,0,0.3);
          display:flex; align-items:center; justify-content:center;
          color:white; font-size:0.82rem; font-weight:700; opacity:0; transition:0.2s;
        }
        .pc-img-wrap:hover .pc-zoom-hint { opacity:1; }
        .pc-badge {
          position:absolute; top:14px; left:14px; padding:5px 13px;
          border-radius:99px; font-size:0.72rem; font-weight:800;
          letter-spacing:0.05em; text-transform:uppercase;
        }
        .pc-body { padding:24px; }
        .pc-meta { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
        .pc-meta span {
          font-size:0.72rem; font-weight:700; color:#81a881; background:#f1f8f1;
          padding:4px 10px; border-radius:99px; letter-spacing:0.03em;
        }
        .pc-name {
          font-family:'Fraunces',serif; font-size:1.5rem; font-weight:900;
          color:#1a2e1a; margin-bottom:8px;
        }
        .pc-desc { font-size:0.87rem; color:#666; line-height:1.6; margin-bottom:20px; }
        .pc-adopt-btn {
          width:100%; padding:13px; border-radius:14px; border:none;
          background:linear-gradient(135deg,#2e7d32,#1b5e20); color:white;
          font-size:0.9rem; font-weight:800; cursor:pointer;
          font-family:'DM Sans',sans-serif; transition:all 0.25s;
          letter-spacing:0.3px;
        }
        .pc-adopt-btn:hover { box-shadow:0 6px 18px rgba(46,125,50,0.35); transform:translateY(-1px); }

        /* ── Zoom overlay ── */
        .ad-zoom-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.92);
          z-index:3000; display:flex; align-items:center; justify-content:center;
          cursor:zoom-out; animation:popIn 0.2s ease;
        }
        .ad-zoom-img { max-width:92%; max-height:88vh; border-radius:16px; box-shadow:0 40px 80px rgba(0,0,0,0.5); }

        /* ── Modal ── */
        .ad-modal-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.55);
          z-index:2000; display:flex; align-items:center; justify-content:center;
          padding:16px; backdrop-filter:blur(8px);
        }
        .ad-modal {
          background:white; width:100%; max-width:460px; border-radius:28px;
          padding:40px; position:relative; animation:popIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
          max-height:90vh; overflow-y:auto;
        }
        .ad-modal-close {
          position:absolute; top:20px; right:20px; background:#f5f5f5;
          border:none; border-radius:50%; width:34px; height:34px; font-size:1rem;
          cursor:pointer; color:#888; display:flex; align-items:center; justify-content:center;
          transition:background 0.2s;
        }
        .ad-modal-close:hover { background:#eee; }
        .ad-modal-pet-strip {
          display:flex; align-items:center; gap:14px; padding:14px;
          background:#f1f8f1; border-radius:14px; margin-bottom:24px;
        }
        .ad-modal-pet-img { width:54px; height:54px; border-radius:12px; object-fit:cover; }
        .ad-modal-pet-name { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:900; color:#1a2e1a; }
        .ad-modal-pet-type { font-size:0.78rem; color:#81a881; font-weight:700; }

        .ad-modal h2 { font-family:'Fraunces',serif; font-size:1.6rem; font-weight:900; color:#1a2e1a; margin-bottom:6px; }
        .ad-modal-sub { font-size:0.85rem; color:#999; margin-bottom:24px; }

        .ad-label { display:block; font-size:0.7rem; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:#2e7d32; margin-bottom:6px; margin-top:16px; }
        .ad-input {
          width:100%; padding:13px 16px; border:2px solid #e8f0e8; border-radius:12px;
          font-size:0.92rem; font-family:'DM Sans',sans-serif; color:#1a2e1a;
          outline:none; transition:border-color 0.2s; resize:vertical;
        }
        .ad-input:focus { border-color:#2e7d32; }
        .ad-error { font-size:0.8rem; color:#c62828; margin-top:10px; font-weight:600; }
        .ad-switch { font-size:0.85rem; color:#888; text-align:center; margin-top:16px; }
        .ad-switch span { color:#2e7d32; font-weight:700; cursor:pointer; }
        .ad-switch span:hover { text-decoration:underline; }

        .ad-submit-btn {
          width:100%; padding:15px; border-radius:14px; border:none; margin-top:20px;
          background:linear-gradient(135deg,#2e7d32,#1b5e20); color:white;
          font-size:0.95rem; font-weight:800; cursor:pointer;
          font-family:'DM Sans',sans-serif; transition:all 0.25s; letter-spacing:0.3px;
        }
        .ad-submit-btn:hover:not(:disabled) { box-shadow:0 8px 20px rgba(46,125,50,0.35); transform:translateY(-1px); }
        .ad-submit-btn:disabled { background:#c8d8c8; cursor:not-allowed; }

        .ad-success { text-align:center; padding:16px 0; }
        .ad-success-icon { font-size:5rem; margin-bottom:16px; animation:popIn 0.5s cubic-bezier(0.34,1.56,0.64,1); display:block; }
        .ad-success h2 { font-family:'Fraunces',serif; font-size:1.8rem; color:#1a2e1a; margin-bottom:8px; }
        .ad-success p { color:#888; font-size:0.9rem; margin-bottom:24px; line-height:1.6; }

        @media(max-width:600px) {
          .ad-controls { margin:-40px 16px 0; padding:20px; }
          .ad-hero h1 { font-size:2rem; }
          .ad-hero-stats { gap:24px; }
          .ad-grid { padding:0 16px; margin:36px auto; }
          .ad-modal { padding:28px 22px; }
        }
      `}</style>

      {/* Hero */}
      <section className="ad-hero">
        <div className="ad-hero-bg" />
        <div className="ad-hero-paws">🐾</div>
        <h1>Find Your <em>Forever</em> Friend</h1>
        <p>Every pet here is rescued, vaccinated, and waiting for a home like yours in Cebu.</p>
        <div className="ad-hero-stats">
          <div className="ad-stat"><div className="ad-stat-num">{PET_DATA.length}</div><div className="ad-stat-label">Available</div></div>
          <div className="ad-stat"><div className="ad-stat-num">4</div><div className="ad-stat-label">Species</div></div>
          <div className="ad-stat"><div className="ad-stat-num">100%</div><div className="ad-stat-label">Rescued</div></div>
        </div>
      </section>

      {/* Controls */}
      <div className="ad-controls">
        <div className="ad-search-wrap">
          <span className="ad-search-icon">🔍</span>
          <input
            className="ad-search"
            placeholder="Search by name or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ad-chips">
          {Object.keys(TYPE_ICONS).map((cat) => (
            <button key={cat} className={`ad-chip ${filter === cat ? "active" : ""}`} onClick={() => setFilter(cat)}>
              {TYPE_ICONS[cat]} {cat === "All" ? "All Pets" : `${cat}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="ad-grid">
        {filteredPets.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty-icon">🔍</div>
            <p>No pets found for "<strong>{search}</strong>". Try a different search.</p>
          </div>
        ) : (
          filteredPets.map((pet, i) => (
            <PetCard key={pet.id} pet={pet} index={i} onAdopt={openAdopt} onZoom={setZoomImage} />
          ))
        )}
      </div>

      {/* Zoom */}
      {zoomImage && (
        <div className="ad-zoom-overlay" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} className="ad-zoom-img" alt="Zoomed" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Modal */}
      {selectedPet && (
        <div className="ad-modal-overlay" onClick={closeModal}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ad-modal-close" onClick={closeModal}>✕</button>

            {/* Pet strip shown on adopt step */}
            {modalStep === "adopt" && (
              <div className="ad-modal-pet-strip">
                <img className="ad-modal-pet-img" src={selectedPet.image} alt={selectedPet.name} />
                <div>
                  <div className="ad-modal-pet-name">{selectedPet.name}</div>
                  <div className="ad-modal-pet-type">{selectedPet.type} · {selectedPet.gender} · {selectedPet.age}</div>
                </div>
              </div>
            )}

            {/* Login */}
            {!isLoggedIn && modalStep === "login" && (
              <>
                <h2>Welcome back 👋</h2>
                <p className="ad-modal-sub">Log in to submit your adoption application.</p>
                <label className="ad-label">Email</label>
                <ModalInput type="email" placeholder="you@email.com" value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} />
                <label className="ad-label">Password</label>
                <ModalInput type="password" placeholder="Your password" value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} />
                {authError && <p className="ad-error">⚠️ {authError}</p>}
                <button className="ad-submit-btn" onClick={() => handleAuth("login")} disabled={loading}>{loading ? "Logging in…" : "Login"}</button>
                <p className="ad-switch">New here? <span onClick={() => { setModalStep("register"); setAuthError(""); }}>Create an account</span></p>
              </>
            )}

            {/* Register */}
            {!isLoggedIn && modalStep === "register" && (
              <>
                <h2>Create account 🐾</h2>
                <p className="ad-modal-sub">Join to start your adoption journey.</p>
                <label className="ad-label">Full Name</label>
                <ModalInput placeholder="Juan dela Cruz" value={authData.name} onChange={(e) => setAuthData({ ...authData, name: e.target.value })} />
                <label className="ad-label">Email</label>
                <ModalInput type="email" placeholder="you@email.com" value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} />
                <label className="ad-label">Password</label>
                <ModalInput type="password" placeholder="Min. 6 characters" value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} />
                {authError && <p className="ad-error">⚠️ {authError}</p>}
                <button className="ad-submit-btn" onClick={() => handleAuth("register")} disabled={loading}>{loading ? "Creating…" : "Create Account"}</button>
                <p className="ad-switch">Already have an account? <span onClick={() => { setModalStep("login"); setAuthError(""); }}>Log in</span></p>
              </>
            )}

            {/* Adopt form */}
            {modalStep === "adopt" && (
              <>
                <h2>Adopt {selectedPet.name}</h2>
                <p className="ad-modal-sub">Tell us a little about yourself and your home.</p>
                <label className="ad-label">Phone Number</label>
                <ModalInput type="tel" placeholder="+63 917 000 0000" value={contactData.phone} onChange={(e) => setContactData({ ...contactData, phone: e.target.value })} />
                <label className="ad-label">About Your Home</label>
                <ModalInput rows={4} placeholder="Describe your living situation, experience with pets, why you'd love this pet…" value={contactData.notes} onChange={(e) => setContactData({ ...contactData, notes: e.target.value })} />
                {authError && <p className="ad-error">⚠️ {authError}</p>}
                <button className="ad-submit-btn" onClick={handleSubmit} disabled={loading}>{loading ? "Submitting…" : "Submit Application"}</button>
              </>
            )}

            {/* Success */}
            {modalStep === "success" && (
              <div className="ad-success">
                <span className="ad-success-icon">🎉</span>
                <h2>Application Sent!</h2>
                <p>We've received your application for <strong>{selectedPet.name}</strong>. Our team will reach out within 1–2 business days. Thank you for giving a pet a second chance!</p>
                <button className="ad-submit-btn" onClick={closeModal}>Back to Pets</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}