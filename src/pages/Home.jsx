import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const PETS = [
  { id: 1, name: "Max", type: "Labrador", age: "2 years", desc: "Friendly, energetic, and loves the outdoors. Max is always up for an adventure.", img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800", badge: "Dog" },
  { id: 2, name: "Bella", type: "Beagle", age: "1 year", desc: "Playful and curious with the softest ears you've ever touched. A born explorer.", img: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=800", badge: "Dog" },
  { id: 3, name: "Milo", type: "Mixed Cat", age: "3 years", desc: "Calm, wise, and endlessly affectionate. Milo will curl up next to you every evening.", img: "https://images.unsplash.com/photo-1514888286872-01d6d89f4c2e?auto=format&fit=crop&q=80&w=800", badge: "Cat" },
  { id: 4, name: "Luna", type: "Terrier", age: "2 years", desc: "Spirited, clever, and deeply loyal. Luna has never met a stranger.", img: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=800", badge: "Dog" },
];

const TESTIMONIALS = [
  { id: 1, name: "Maria Santos", location: "Cebu City", img: "https://randomuser.me/api/portraits/women/68.jpg", text: "VetAdopt made finding our fur baby so easy. The process was smooth, transparent, and the team genuinely cared. We couldn't be happier with our new family member!" },
  { id: 2, name: "James Reyes", location: "Mandaue", img: "https://randomuser.me/api/portraits/men/72.jpg", text: "I was skeptical at first but the entire experience was heartwarming. The vet verification feature gave me so much confidence. Max settled in on day one." },
  { id: 3, name: "Sofia Lim", location: "Lapu-Lapu", img: "https://randomuser.me/api/portraits/women/65.jpg", text: "Adopted Luna three months ago and she's already the queen of our home. Thank you VetAdopt for connecting us with the perfect companion." },
];

const STATS = [
  { num: "5,200+", label: "Pets Rehomed", icon: "🏠" },
  { num: "120+", label: "Partner Shelters", icon: "🤝" },
  { num: "98%", label: "Happy Families", icon: "❤️" },
  { num: "24/7", label: "Vet Support", icon: "🩺" },
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
  const petTimer = useRef(null);

  useScrollReveal();

  // Pet carousel auto-play
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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes heroText { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatPaw { 0%,100%{transform:translateY(0) rotate(-10deg)} 50%{transform:translateY(-16px) rotate(-10deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
        @keyframes slideImg { from{opacity:0;transform:scale(1.04)} to{opacity:1;transform:scale(1)} }
        @keyframes countUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .hm-root { font-family:'Plus Jakarta Sans',sans-serif; color:#1a1a1a; overflow-x:hidden; background:#fff; }

        /* ── Reveal ── */
        .reveal { opacity:0; transform:translateY(32px); transition:opacity 0.7s ease, transform 0.7s ease; }
        .reveal.revealed { opacity:1; transform:translateY(0); }
        .reveal-d1 { transition-delay:0.1s; }
        .reveal-d2 { transition-delay:0.2s; }
        .reveal-d3 { transition-delay:0.3s; }
        .reveal-d4 { transition-delay:0.4s; }

        /* ── Hero ── */
        .hm-hero {
          position:relative; min-height:100vh; display:flex; align-items:center;
          justify-content:center; overflow:hidden;
          background: linear-gradient(160deg,#071a09 0%,#0d2e12 50%,#0a2010 100%);
        }
        .hm-hero-bg {
          position:absolute; inset:0;
          background: url('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=60&w=1600') center/cover no-repeat;
          opacity:0.18; transform:scale(1.04);
        }
        .hm-hero-grain {
          position:absolute; inset:0; opacity:0.035;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size:200px;
        }
        .hm-hero-glow {
          position:absolute; width:600px; height:600px; border-radius:50%;
          background:radial-gradient(circle,rgba(56,142,60,0.22),transparent 65%);
          top:-100px; right:-100px; pointer-events:none;
        }
        .hm-hero-content {
          position:relative; z-index:2; text-align:center; padding:0 24px; max-width:820px;
        }
        .hm-hero-eyebrow {
          display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15); border-radius:99px;
          padding:7px 18px; font-size:0.75rem; font-weight:700; color:rgba(255,255,255,0.7);
          letter-spacing:0.1em; text-transform:uppercase; margin-bottom:28px;
          animation:heroText 0.8s 0.1s ease both;
        }
        .hm-hero h1 {
          font-family:'Cormorant Garamond',serif; font-size:clamp(3rem,7vw,5.5rem);
          font-weight:700; color:white; line-height:1.08; margin-bottom:22px;
          animation:heroText 0.8s 0.25s ease both;
        }
        .hm-hero h1 em { font-style:italic; color:#81c784; }
        .hm-hero-sub {
          font-size:1.05rem; color:rgba(255,255,255,0.6); line-height:1.7;
          margin-bottom:40px; max-width:500px; margin-left:auto; margin-right:auto;
          animation:heroText 0.8s 0.4s ease both;
        }
        .hm-hero-btns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; animation:heroText 0.8s 0.55s ease both; }
        .hm-btn-primary {
          padding:15px 36px; border-radius:99px; border:none;
          background:linear-gradient(135deg,#388e3c,#1b5e20); color:white;
          font-size:0.95rem; font-weight:800; cursor:pointer;
          font-family:'Plus Jakarta Sans',sans-serif;
          box-shadow:0 8px 24px rgba(56,142,60,0.4); transition:all 0.25s;
          letter-spacing:0.2px;
        }
        .hm-btn-primary:hover { transform:translateY(-2px); box-shadow:0 14px 32px rgba(56,142,60,0.5); }
        .hm-btn-ghost {
          padding:15px 36px; border-radius:99px;
          border:2px solid rgba(255,255,255,0.25); background:transparent;
          color:rgba(255,255,255,0.85); font-size:0.95rem; font-weight:700;
          cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.25s;
        }
        .hm-btn-ghost:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.5); }
        .hm-hero-paw {
          position:absolute; font-size:14rem; opacity:0.04; bottom:-30px; left:-20px;
          line-height:1; pointer-events:none; animation:floatPaw 6s ease-in-out infinite;
          transform-origin:center;
        }
        .hm-scroll-hint {
          position:absolute; bottom:36px; left:50%; transform:translateX(-50%);
          display:flex; flex-direction:column; align-items:center; gap:6px;
          color:rgba(255,255,255,0.3); font-size:0.7rem; font-weight:700;
          letter-spacing:0.12em; text-transform:uppercase; z-index:2;
          animation:heroText 1s 1s ease both;
        }
        .hm-scroll-line {
          width:1px; height:40px;
          background:linear-gradient(to bottom,rgba(255,255,255,0.3),transparent);
        }

        /* ── Stats ── */
        .hm-stats { background:#f8fdf8; padding:64px 24px; }
        .hm-stats-inner { max-width:960px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }
        .hm-stat {
          text-align:center; padding:28px 16px; background:white; border-radius:20px;
          border:1px solid #e8f4e8; transition:transform 0.2s, box-shadow 0.2s;
        }
        .hm-stat:hover { transform:translateY(-4px); box-shadow:0 12px 30px rgba(46,125,50,0.1); }
        .hm-stat-icon { font-size:1.8rem; margin-bottom:10px; display:block; }
        .hm-stat-num { font-family:'Cormorant Garamond',serif; font-size:2.4rem; font-weight:700; color:#1b5e20; line-height:1; }
        .hm-stat-label { font-size:0.75rem; font-weight:700; color:#9aaa9a; text-transform:uppercase; letter-spacing:0.07em; margin-top:4px; }

        /* ── Featured Pets ── */
        .hm-pets { max-width:1160px; margin:0 auto; padding:96px 24px; }
        .hm-section-label { font-size:0.72rem; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#388e3c; margin-bottom:10px; }
        .hm-section-title { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4vw,3rem); font-weight:700; color:#1a2e1a; line-height:1.15; }
        .hm-section-sub { color:#888; font-size:0.92rem; margin-top:8px; line-height:1.6; }

        .hm-carousel { margin-top:48px; position:relative; }
        .hm-carousel-inner {
          display:grid; grid-template-columns:1fr 1fr; gap:0; border-radius:28px;
          overflow:hidden; box-shadow:0 30px 70px rgba(0,0,0,0.12); min-height:460px;
        }
        .hm-carousel-img { position:relative; overflow:hidden; }
        .hm-carousel-img img {
          width:100%; height:100%; object-fit:cover; display:block;
          animation:slideImg 0.6s ease both;
        }
        .hm-carousel-img-overlay {
          position:absolute; inset:0;
          background:linear-gradient(to right,rgba(0,0,0,0.15),transparent);
        }
        .hm-carousel-info {
          background:white; padding:52px 48px;
          display:flex; flex-direction:column; justify-content:center;
        }
        .hm-pet-badge {
          display:inline-block; padding:5px 14px; border-radius:99px;
          background:#e8f5e9; color:#2e7d32; font-size:0.72rem; font-weight:800;
          letter-spacing:0.06em; text-transform:uppercase; margin-bottom:16px;
        }
        .hm-pet-name {
          font-family:'Cormorant Garamond',serif; font-size:3rem; font-weight:700;
          color:#1a2e1a; line-height:1; margin-bottom:4px;
        }
        .hm-pet-type { font-size:0.88rem; color:#9aaa9a; font-weight:600; margin-bottom:16px; }
        .hm-pet-desc { font-size:0.95rem; color:#555; line-height:1.7; margin-bottom:32px; }
        .hm-pet-cta {
          padding:14px 28px; border-radius:14px; border:none; width:fit-content;
          background:linear-gradient(135deg,#2e7d32,#1b5e20); color:white;
          font-size:0.9rem; font-weight:800; cursor:pointer;
          font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.25s; letter-spacing:0.2px;
        }
        .hm-pet-cta:hover { box-shadow:0 6px 20px rgba(46,125,50,0.35); transform:translateY(-1px); }

        .hm-carousel-nav { display:flex; align-items:center; gap:14px; margin-top:24px; justify-content:flex-end; }
        .hm-nav-btn {
          width:44px; height:44px; border-radius:50%; border:2px solid #e0ece0;
          background:white; display:flex; align-items:center; justify-content:center;
          cursor:pointer; font-size:1.1rem; transition:all 0.2s; color:#2e7d32;
        }
        .hm-nav-btn:hover { background:#2e7d32; color:white; border-color:#2e7d32; box-shadow:0 4px 12px rgba(46,125,50,0.3); }
        .hm-carousel-dots { display:flex; gap:7px; }
        .hm-dot {
          width:8px; height:8px; border-radius:99px; background:#c8e6c9;
          cursor:pointer; transition:all 0.3s;
        }
        .hm-dot.active { width:24px; background:#2e7d32; }

        /* ── How it works ── */
        .hm-how { background:linear-gradient(160deg,#0d2e12,#1b5e20); padding:100px 24px; }
        .hm-how-inner { max-width:1000px; margin:0 auto; text-align:center; }
        .hm-how h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4vw,3rem); font-weight:700; color:white; margin-bottom:10px; }
        .hm-how-sub { color:rgba(255,255,255,0.5); font-size:0.92rem; margin-bottom:60px; }
        .hm-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; }
        .hm-step {
          background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
          border-radius:24px; padding:36px 28px; text-align:left; transition:background 0.2s;
        }
        .hm-step:hover { background:rgba(255,255,255,0.1); }
        .hm-step-num {
          font-family:'Cormorant Garamond',serif; font-size:3.5rem; font-weight:700;
          color:rgba(255,255,255,0.12); line-height:1; margin-bottom:16px;
        }
        .hm-step-icon { font-size:2rem; margin-bottom:12px; display:block; }
        .hm-step h3 { font-size:1rem; font-weight:800; color:white; margin-bottom:8px; }
        .hm-step p { font-size:0.85rem; color:rgba(255,255,255,0.5); line-height:1.65; }

        /* ── Testimonials ── */
        .hm-test { padding:100px 24px; background:#f8fdf8; }
        .hm-test-inner { max-width:720px; margin:0 auto; text-align:center; }
        .hm-test h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4vw,3rem); font-weight:700; color:#1a2e1a; margin-bottom:48px; }
        .hm-test-card {
          background:white; border-radius:24px; padding:44px 48px;
          box-shadow:0 20px 50px rgba(0,0,0,0.07); border:1px solid #eef4ee;
          transition:opacity 0.3s, transform 0.3s; min-height:260px;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
        }
        .hm-test-card.fade-out { opacity:0; transform:translateY(8px); }
        .hm-test-img { width:72px; height:72px; border-radius:50%; object-fit:cover; margin-bottom:20px; border:3px solid #e8f4e8; }
        .hm-test-quote {
          font-family:'Cormorant Garamond',serif; font-size:1.35rem; font-style:italic;
          color:#1a2e1a; line-height:1.6; margin-bottom:18px;
        }
        .hm-test-name { font-size:0.82rem; font-weight:800; color:#2e7d32; }
        .hm-test-loc { font-size:0.75rem; color:#9aaa9a; font-weight:600; margin-top:2px; }
        .hm-test-dots { display:flex; gap:8px; justify-content:center; margin-top:28px; }

        /* ── CTA ── */
        .hm-cta {
          padding:120px 24px; text-align:center;
          background:linear-gradient(135deg,#f1f8f1 0%,#e8f5e9 100%);
          position:relative; overflow:hidden;
        }
        .hm-cta::before {
          content:'🐾'; position:absolute; font-size:20rem; opacity:0.04;
          right:-60px; top:-60px; pointer-events:none; line-height:1;
        }
        .hm-cta h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(2.2rem,5vw,3.8rem); font-weight:700; color:#1a2e1a; line-height:1.15; margin-bottom:16px; }
        .hm-cta h2 em { font-style:italic; color:#2e7d32; }
        .hm-cta p { font-size:1rem; color:#888; margin-bottom:36px; }

        /* ── Responsive ── */
        @media(max-width:860px) {
          .hm-stats-inner { grid-template-columns:repeat(2,1fr); }
          .hm-carousel-inner { grid-template-columns:1fr; }
          .hm-carousel-img { height:280px; }
          .hm-carousel-info { padding:32px 28px; }
          .hm-steps { grid-template-columns:1fr; }
          .hm-test-card { padding:32px 28px; }
        }
        @media(max-width:480px) {
          .hm-stats-inner { grid-template-columns:repeat(2,1fr); gap:14px; }
          .hm-hero h1 { font-size:2.8rem; }
          .hm-hero-btns { flex-direction:column; align-items:center; }
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="hm-hero">
        <div className="hm-hero-bg" />
        <div className="hm-hero-grain" />
        <div className="hm-hero-glow" />
        <span className="hm-hero-paw">🐾</span>

        <div className="hm-hero-content">
          <div className="hm-hero-eyebrow">🐾 Cebu's #1 Pet Adoption Platform</div>
          <h1>Give every pet a<br /><em>forever home</em></h1>
          <p className="hm-hero-sub">Over 5,200 animals found their families this year. Yours is waiting.</p>
          <div className="hm-hero-btns">
            <button className="hm-btn-primary" onClick={() => navigate("/adopt")}>Adopt a Friend →</button>
            <button className="hm-btn-ghost" onClick={() => navigate("/donate")}>Support Our Mission</button>
          </div>
        </div>

        <div className="hm-scroll-hint">
          <span>Scroll</span>
          <div className="hm-scroll-line" />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="hm-stats">
        <div className="hm-stats-inner">
          {STATS.map((s, i) => (
            <div key={s.label} className={`hm-stat reveal reveal-d${i + 1}`}>
              <span className="hm-stat-icon">{s.icon}</span>
              <div className="hm-stat-num">{s.num}</div>
              <div className="hm-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Pets ── */}
      <section className="hm-pets">
        <div className="reveal">
          <div className="hm-section-label">Ready to meet someone?</div>
          <h2 className="hm-section-title">Featured Residents</h2>
          <p className="hm-section-sub">Every one of these animals has been rescued, vetted, and is ready for a loving home.</p>
        </div>

        <div className="hm-carousel reveal">
          <div className="hm-carousel-inner" key={petIdx}>
            <div className="hm-carousel-img">
              <img src={pet.img} alt={pet.name} />
              <div className="hm-carousel-img-overlay" />
            </div>
            <div className="hm-carousel-info">
              <span className="hm-pet-badge">{pet.badge}</span>
              <h3 className="hm-pet-name">{pet.name}</h3>
              <p className="hm-pet-type">{pet.type} · {pet.age}</p>
              <p className="hm-pet-desc">{pet.desc}</p>
              <button className="hm-pet-cta" onClick={() => navigate("/adopt")}>Meet {pet.name} →</button>
            </div>
          </div>

          <div className="hm-carousel-nav">
            <div className="hm-carousel-dots">
              {PETS.map((_, i) => (
                <div key={i} className={`hm-dot ${i === petIdx ? "active" : ""}`} onClick={() => setPetIdx(i)} />
              ))}
            </div>
            <button className="hm-nav-btn" onClick={() => goToPet(-1)}>←</button>
            <button className="hm-nav-btn" onClick={() => goToPet(1)}>→</button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="hm-how">
        <div className="hm-how-inner">
          <div className="reveal">
            <div className="hm-section-label" style={{ color: "rgba(255,255,255,0.4)" }}>Simple process</div>
            <h2>How VetAdopt Works</h2>
            <p className="hm-how-sub">From browsing to bringing your pet home — we make it easy.</p>
          </div>
          <div className="hm-steps">
            {[
              { icon: "🔍", num: "01", title: "Browse & Match", desc: "Filter by type, age, and personality. Use our PetMatchmaker quiz to find your perfect fit." },
              { icon: "📋", num: "02", title: "Apply in Minutes", desc: "Fill out a simple application. No lengthy paperwork — just a quick form and a phone call." },
              { icon: "🏠", num: "03", title: "Welcome Home", desc: "Meet your new companion, complete the adoption, and begin your life together." },
            ].map((s, i) => (
              <div key={s.num} className={`hm-step reveal reveal-d${i + 1}`}>
                <div className="hm-step-num">{s.num}</div>
                <span className="hm-step-icon">{s.icon}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="hm-test">
        <div className="hm-test-inner">
          <h2 className="reveal">What families are saying</h2>
          <div className={`hm-test-card reveal ${!testFade ? "fade-out" : ""}`}>
            <img className="hm-test-img" src={TESTIMONIALS[testIdx].img} alt={TESTIMONIALS[testIdx].name} />
            <p className="hm-test-quote">"{TESTIMONIALS[testIdx].text}"</p>
            <div className="hm-test-name">{TESTIMONIALS[testIdx].name}</div>
            <div className="hm-test-loc">{TESTIMONIALS[testIdx].location}</div>
          </div>
          <div className="hm-test-dots">
            {TESTIMONIALS.map((_, i) => (
              <div key={i} className={`hm-dot ${i === testIdx ? "active" : ""}`} onClick={() => goToTest(i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="hm-cta">
        <h2 className="reveal">Ready to find your<br /><em>forever friend?</em></h2>
        <p className="reveal">Every adoption gives a rescued animal a second chance at a happy life.</p>
        <div className="reveal" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="hm-btn-primary" style={{ boxShadow: "0 8px 24px rgba(46,125,50,0.3)" }} onClick={() => navigate("/adopt")}>Browse All Pets</button>
          <button
            onClick={() => navigate("/petmatchmaker")}
            style={{ padding: "15px 36px", borderRadius: "99px", border: "2px solid #c8e6c9", background: "white", color: "#2e7d32", fontSize: "0.95rem", fontWeight: "800", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "all 0.25s" }}
          >
            Take the Quiz 🐾
          </button>
        </div>
      </section>
    </div>
  );
}