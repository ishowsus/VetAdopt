import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const PETS = [
  { id: 1, name: "Max", type: "Labrador Retriever", age: "2 years", desc: "Fully vaccinated, neutered, and friendly. Max loves long walks and is eager to find an active family.", img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800", badge: "Dogs", healthScore: "100% Vetted" },
  { id: 2, name: "Bella", type: "Beagle Mix", age: "1 year", desc: "Microchipped and playful with the softest ears. Great with children and other small dogs.", img: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=800", badge: "Dogs", healthScore: "100% Vetted" },
  { id: 3, name: "Milo", type: "Domestic Shorthair", age: "3 years", desc: "Dewormed, spayed, and endlessly affectionate. Milo enjoys quiet sunny spots and indoor lap naps.", img: "https://images.unsplash.com/photo-1514888286872-01d6d89f4c2e?auto=format&fit=crop&q=80&w=800", badge: "Cats", healthScore: "100% Vetted" },
  { id: 4, name: "Luna", type: "Terrier Cross", age: "2 years", desc: "Energetic and deeply loyal. Health checked by local Cebu partner clinics.", img: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=800", badge: "Dogs", healthScore: "100% Vetted" },
];

const FEATURES = [
  { icon: "🩺", title: "Veterinary-Certified Profiles", desc: "Every listed animal undergoes comprehensive health screening, vaccination, and spay/neuter status checks." },
  { icon: "🎯", title: "Smart Matchmaker Engine", desc: "Our algorithm matches adopters with pets based on living space, lifestyle, schedule, and experience level." },
  { icon: "🛡️", title: "Verified Partner Shelters", desc: "Direct network integration with registered animal welfare organizations and municipal pounds across Metro Cebu." },
  { icon: "📊", title: "Post-Adoption Tracking", desc: "Digital health logs and reminder schedules for vaccines, check-ups, and post-adoption wellness follow-ups." },
];

const TESTIMONIALS = [
  { id: 1, name: "Maria Santos", location: "Cebu City", img: "https://randomuser.me/api/portraits/women/68.jpg", text: "VetAdopt gave us complete confidence. Seeing Bella's full medical records and vet verification before adopting made the entire transition smooth and worry-free." },
  { id: 2, name: "James Reyes", location: "Mandaue City", img: "https://randomuser.me/api/portraits/men/72.jpg", text: "The Matchmaker Quiz recommended Max based on our apartment rules and daily schedule. He fit into our routine seamlessly from day one." },
  { id: 3, name: "Sofia Lim", location: "Lapu-Lapu City", img: "https://randomuser.me/api/portraits/women/65.jpg", text: "As a first-time pet owner, having ongoing vet support reminders directly through VetAdopt's platform was a lifesaver!" },
];

const STATS = [
  { num: "5,200+", label: "Verified Rehomes", icon: "🏠" },
  { num: "120+", label: "Vet Partner Clinics", icon: "🩺" },
  { num: "98.4%", label: "Successful Matches", icon: "❤️" },
  { num: "24/7", label: "Digital Records Access", icon: "📋" },
];

function useScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

export default function Home() {
  const navigate = useNavigate();
  const [petIdx, setPetIdx] = useState(0);
  const [testIdx, setTestIdx] = useState(0);
  const [testFade, setTestFade] = useState(true);
  const [searchCategory, setSearchCategory] = useState("all");
  const petTimer = useRef(null);

  useScrollReveal();

  useEffect(() => {
    petTimer.current = setInterval(() => setPetIdx((p) => (p + 1) % PETS.length), 5000);
    return () => clearInterval(petTimer.current);
  }, []);

  const goToPet = (dir) => {
    clearInterval(petTimer.current);
    setPetIdx((p) => (p + dir + PETS.length) % PETS.length);
    petTimer.current = setInterval(() => setPetIdx((p) => (p + 1) % PETS.length), 5000);
  };

  const goToTest = (i) => {
    setTestFade(false);
    setTimeout(() => { setTestIdx(i); setTestFade(true); }, 280);
  };

  useEffect(() => {
    const t = setInterval(() => goToTest((testIdx + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(t);
  }, [testIdx]);

  const pet = PETS[petIdx];

  return (
    <div className="hm-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .hm-root { font-family:'Plus Jakarta Sans',sans-serif; color:#1a1a1a; overflow-x:hidden; background:#fff; }

        /* Reveal Animations */
        .reveal { opacity:0; transform:translateY(32px); transition:opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal.revealed { opacity:1; transform:translateY(0); }
        .reveal-d1 { transition-delay:0.1s; }
        .reveal-d2 { transition-delay:0.2s; }
        .reveal-d3 { transition-delay:0.3s; }
        .reveal-d4 { transition-delay:0.4s; }

        /* Hero Section */
        .hm-hero {
          position:relative; min-height:92vh; display:flex; align-items:center; justify-content:center;
          background: linear-gradient(155deg, #051407 0%, #0d2e12 45%, #081d0c 100%);
          padding: 80px 24px 60px;
        }
        .hm-hero-bg {
          position:absolute; inset:0;
          background: url('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=60&w=1600') center/cover no-repeat;
          opacity:0.16; transform:scale(1.02);
        }
        .hm-hero-content {
          position:relative; z-index:2; text-align:center; max-width:880px; margin:0 auto;
        }
        .hm-hero-badge {
          display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.1);
          border:1px solid rgba(255,255,255,0.2); border-radius:99px; padding:8px 20px;
          font-size:0.78rem; font-weight:700; color:#a5d6a7; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:24px;
        }
        .hm-hero h1 {
          font-family:'Cormorant Garamond',serif; font-size:clamp(2.8rem, 6.5vw, 5.2rem);
          font-weight:700; color:white; line-height:1.08; margin-bottom:20px;
        }
        .hm-hero h1 em { font-style:italic; color:#81c784; }
        .hm-hero-sub {
          font-size:1.1rem; color:rgba(255,255,255,0.75); line-height:1.65;
          margin-bottom:36px; max-width:620px; margin-left:auto; margin-right:auto;
        }

        /* Search Filter Box */
        .hm-search-bar {
          background:white; border-radius:20px; padding:12px; max-width:680px; margin:0 auto 36px;
          display:flex; gap:10px; align-items:center; box-shadow:0 20px 40px rgba(0,0,0,0.3);
          flex-wrap:wrap;
        }
        .hm-search-select {
          flex:1; min-width:140px; padding:12px 16px; border-radius:12px; border:1px solid #e0e0e0;
          font-family:inherit; font-weight:600; font-size:0.9rem; color:#333; outline:none; background:#f9f9f9;
        }
        .hm-btn-search {
          padding:14px 30px; border-radius:12px; border:none; background:#2e7d32; color:white;
          font-weight:700; font-size:0.95rem; cursor:pointer; transition:all 0.2s;
        }
        .hm-btn-search:hover { background:#1b5e20; }

        /* Stats */
        .hm-stats { background:#f4f9f4; padding:50px 24px; border-bottom:1px solid #e0eee0; }
        .hm-stats-inner { max-width:1040px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .hm-stat {
          text-align:center; padding:24px 16px; background:white; border-radius:16px;
          border:1px solid #e2efe2; box-shadow:0 4px 12px rgba(0,0,0,0.02);
        }
        .hm-stat-num { font-family:'Cormorant Garamond',serif; font-size:2.2rem; font-weight:700; color:#1b5e20; }
        .hm-stat-label { font-size:0.75rem; font-weight:700; color:#6b7c6e; text-transform:uppercase; letter-spacing:0.05em; margin-top:4px; }

        /* Capstone Features Section */
        .hm-features { max-width:1120px; margin:0 auto; padding:90px 24px; }
        .hm-grid-features { display:grid; grid-template-columns:repeat(2,1fr); gap:24px; margin-top:40px; }
        .hm-feature-card {
          background:#fff; border:1px solid #e8f0e8; padding:32px; border-radius:20px;
          transition:all 0.25s ease; position:relative; overflow:hidden;
        }
        .hm-feature-card:hover { transform:translateY(-4px); box-shadow:0 12px 30px rgba(46,125,50,0.08); border-color:#c8e6c9; }
        .hm-feature-icon { font-size:2.2rem; margin-bottom:16px; display:inline-block; }
        .hm-feature-card h3 { font-size:1.15rem; font-weight:700; color:#1a2e1a; margin-bottom:8px; }
        .hm-feature-card p { font-size:0.9rem; color:#666; line-height:1.6; }

        /* Carousel */
        .hm-pets { max-width:1120px; margin:0 auto; padding:0 24px 90px; }
        .hm-carousel-inner {
          display:grid; grid-template-columns:1fr 1fr; border-radius:24px; overflow:hidden;
          box-shadow:0 20px 50px rgba(0,0,0,0.08); background:white; border:1px solid #e8e8e8;
        }
        .hm-carousel-img { position:relative; min-height:380px; }
        .hm-carousel-img img { width:100%; height:100%; object-fit:cover; display:block; }
        .hm-carousel-info { padding:48px; display:flex; flex-direction:column; justify-content:center; }
        .hm-health-tag { display:inline-block; padding:4px 12px; background:#e8f5e9; color:#2e7d32; border-radius:99px; font-size:0.75rem; font-weight:700; margin-bottom:12px; width:fit-content; }

        /* How it works */
        .hm-how { background:#0d2e12; color:white; padding:90px 24px; }
        .hm-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; max-width:1040px; margin:40px auto 0; }
        .hm-step { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:18px; padding:30px; }

        /* Testimonials */
        .hm-test { padding:90px 24px; background:#f9fbf9; }
        .hm-test-card { background:white; max-width:680px; margin:30px auto 0; padding:40px; border-radius:20px; text-align:center; border:1px solid #e8efe8; box-shadow:0 10px 30px rgba(0,0,0,0.03); }

        /* Responsive */
        @media(max-width:860px) {
          .hm-stats-inner, .hm-grid-features, .hm-steps { grid-template-columns:1fr 1fr; }
          .hm-carousel-inner { grid-template-columns:1fr; }
          .hm-carousel-img { height:260px; }
        }
        @media(max-width:540px) {
          .hm-stats-inner, .hm-grid-features, .hm-steps { grid-template-columns:1fr; }
        }
      `}</style>

      {/* ── HERO SECTION ── */}
      <section className="hm-hero">
        <div className="hm-hero-bg" />
        <div className="hm-hero-content">
          <h1>Veterinary-backed pet adoption <em>made transparent.</em></h1>
          <p className="hm-hero-sub">
            Connecting verified shelters, local clinics, and loving homes. Every animal comes with full health screening and post-adoption records.
          </p>

          {/* Quick Filter Bar */}

  

          <div className="hm-search-bar">
            <select className="hm-search-select" onChange={(e) => setSearchCategory(e.target.value)}>
              <option value="all">All Pet Types</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
            </select>
            <select className="hm-search-select">
              <option value="all">Location (All Metro Cebu)</option>
              <option value="cebu">Cebu City</option>
              <option value="mandaue">Mandaue City</option>
              <option value="lapulapu">Lapu-Lapu City</option>
            </select>
            <button className="hm-btn-search" onClick={() => navigate(`/adopt?type=${searchCategory}`)}>
              Search Pets 🐾
            </button>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button className="hm-btn-search" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }} onClick={() => navigate("/petmatchmaker")}>
              Take Matchmaker Quiz 🎯
            </button>
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="hm-stats">
        <div className="hm-stats-inner">
          {STATS.map((s) => (
            <div key={s.label} className="hm-stat">
              <div className="hm-stat-num">{s.num}</div>
              <div className="hm-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SYSTEM CAPABILITIES / CAPSTONE HIGHLIGHTS ── */}
      <section className="hm-features">
        <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto" }}>
          <span style={{ color: "#2e7d32", fontSize: "0.8rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.1em" }}>System Core Features</span>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.5rem", marginTop: "6px" }}>Bridging the Gap in Pet Rehoming</h2>
          <p style={{ color: "#666", fontSize: "0.95rem" }}>VetAdopt integrates clinical records directly into the adoption workflow to ensure safe and accountable pet transitions.</p>
        </div>

        <div className="hm-grid-features">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`hm-feature-card reveal reveal-d${i + 1}`}>
              <span className="hm-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED RESIDENTS (CAROUSEL) ── */}
      <section className="hm-pets">
        <div style={{ marginBottom: "24px" }}>
          <span style={{ color: "#2e7d32", fontSize: "0.8rem", fontWeight: "800", textTransform: "uppercase" }}>Ready For Adoption</span>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.2rem" }}>Featured Vetted Residents</h2>
        </div>

        <div className="hm-carousel-inner">
          <div className="hm-carousel-img">
            <img src={pet.img} alt={pet.name} />
          </div>
          <div className="hm-carousel-info">
            <span className="hm-health-tag">✓ {pet.healthScore}</span>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.5rem", marginBottom: "4px" }}>{pet.name}</h3>
            <p style={{ color: "#888", fontSize: "0.85rem", fontWeight: "600", marginBottom: "16px" }}>{pet.type} · {pet.age}</p>
            <p style={{ color: "#555", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "28px" }}>{pet.desc}</p>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button className="hm-btn-search" onClick={() => navigate("/adopt")}>View Full Profile & Medical Log →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="hm-how">
        <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
          <h2>How VetAdopt Operates</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "8px" }}>A structured process designed for transparency and animal safety.</p>
        </div>
        <div className="hm-steps">
          <div className="hm-step">
            <h3 style={{ marginBottom: "8px" }}>1. Screening & Verification</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.88rem" }}>Shelters upload medical status, vaccination history, and behavioral assessments verified by partner vets.</p>
          </div>
          <div className="hm-step">
            <h3 style={{ marginBottom: "8px" }}>2. Match & Application</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.88rem" }}>Adopters complete the lifestyle matchmaker and submit an digital application form online.</p>
          </div>
          <div className="hm-step">
            <h3 style={{ marginBottom: "8px" }}>3. Adoption & Follow-up</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.88rem" }}>Finalize adoption with clear health passports and automated reminders for follow-up vet checks.</p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="hm-test">
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.2rem" }}>Community Impact</h2>
        </div>
        <div className="hm-test-card">
          <img src={TESTIMONIALS[testIdx].img} alt="User" style={{ width: "64px", height: "64px", borderRadius: "50%", marginBottom: "16px" }} />
          <p style={{ fontStyle: "italic", color: "#333", fontSize: "1.1rem", marginBottom: "16px" }}>"{TESTIMONIALS[testIdx].text}"</p>
          <div style={{ fontWeight: "700", color: "#2e7d32" }}>{TESTIMONIALS[testIdx].name}</div>
          <div style={{ fontSize: "0.8rem", color: "#888" }}>{TESTIMONIALS[testIdx].location}</div>
        </div>
      </section>
    </div>
  );
}