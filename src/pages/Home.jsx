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
  { value: 5200, suffix: "+", label: "Verified Rehomes", icon: "🏠" },
  { value: 120, suffix: "+", label: "Vet Partner Clinics", icon: "🩺" },
  { value: 98.4, suffix: "%", decimals: 1, label: "Successful Matches", icon: "❤️" },
  { value: 24, suffix: "/7", label: "Digital Records Access", icon: "📋" },
];

/* Reveal-on-scroll: observes every .va-reveal element */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".va-reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("va-in"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("va-in"); obs.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* Animated counter that starts when scrolled into view */
function CountUp({ value, suffix, decimals = 0, icon, label }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const dur = 1500;
      const fmt = (n) => (decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString("en-US"));
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        setDisplay(fmt(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, decimals]);
  return (
    <div className="va-stat va-reveal" ref={ref}>
      <div className="va-stat-icon">{icon}</div>
      <div className="va-stat-num">{display}{suffix}</div>
      <div className="va-stat-label">{label}</div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  useReveal();

  const [petIdx, setPetIdx] = useState(0);
  const [testIdx, setTestIdx] = useState(0);
  const [type, setType] = useState("all");
  const [loc, setLoc] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const petTimer = useRef(null);

  /* Navbar solidify on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Carousel auto-advance (pauses on hover) */
  useEffect(() => {
    petTimer.current = setInterval(() => setPetIdx((p) => (p + 1) % PETS.length), 5000);
    return () => clearInterval(petTimer.current);
  }, []);

  const pauseCarousel = () => clearInterval(petTimer.current);
  const resumeCarousel = () => {
    clearInterval(petTimer.current);
    petTimer.current = setInterval(() => setPetIdx((p) => (p + 1) % PETS.length), 5000);
  };

  const goToPet = (dir) => {
    clearInterval(petTimer.current);
    setPetIdx((p) => (p + dir + PETS.length) % PETS.length);
    resumeCarousel();
  };

  const goToPetDot = (i) => {
    clearInterval(petTimer.current);
    setPetIdx(i);
    resumeCarousel();
  };

  /* Testimonials auto-advance (resets timer on manual change) */
  useEffect(() => {
    const t = setTimeout(() => setTestIdx((i) => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearTimeout(t);
  }, [testIdx]);

  /* Search — both filters are now wired to the query string */
  const search = () => {
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (loc !== "all") params.set("location", loc);
    const qs = params.toString();
    navigate(qs ? `/adopt?${qs}` : "/adopt");
  };

  const pet = PETS[petIdx];
  const test = TESTIMONIALS[testIdx];

  const go = (href) => { setMenuOpen(false); navigate(href); };

  return (
    <div className="va-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .va-root { font-family:'Plus Jakarta Sans',sans-serif; color:#16211a; overflow-x:hidden; background:#fff; }
        .va-root button { font-family:inherit; }
        section { scroll-margin-top: 90px; }

        /* ── Reveal ── */
        .va-reveal { opacity:0; transform:translateY(30px); transition:opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1); }
        .va-reveal.va-in { opacity:1; transform:translateY(0); }
        .va-d1 { transition-delay:0.08s; } .va-d2 { transition-delay:0.16s; }
        .va-d3 { transition-delay:0.24s; } .va-d4 { transition-delay:0.32s; }

        /* ── Buttons ── */
        .va-btn-primary { display:inline-flex; align-items:center; gap:8px; padding:15px 30px; border-radius:14px; border:none; background:linear-gradient(135deg,#3fa34d,#2e7d32); color:#fff; font-weight:700; font-size:0.95rem; cursor:pointer; transition:all 0.25s; box-shadow:0 8px 20px rgba(46,125,50,0.3); }
        .va-btn-primary:hover { transform:translateY(-2px); box-shadow:0 12px 28px rgba(46,125,50,0.4); }
        .va-btn-ghost { display:inline-flex; align-items:center; gap:8px; padding:15px 30px; border-radius:14px; border:1px solid rgba(255,255,255,0.35); background:rgba(255,255,255,0.08); color:#fff; font-weight:700; font-size:0.95rem; cursor:pointer; transition:all 0.25s; }
        .va-btn-ghost:hover { background:rgba(255,255,255,0.18); }
        .va-btn-ghost.dark { border-color:#d5e3d5; background:#fff; color:#2e7d32; }
        .va-btn-ghost.dark:hover { background:#f2f8f2; }

        /* ── Navbar ── */
        .va-nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:16px 24px; transition:all 0.3s; }
        .va-nav-solid { background:rgba(6,20,9,0.88); backdrop-filter:blur(14px); box-shadow:0 6px 24px rgba(0,0,0,0.25); padding:10px 24px; }
        .va-nav-inner { max-width:1160px; margin:0 auto; display:flex; align-items:center; gap:28px; }
        .va-brand { background:none; border:none; color:#fff; font-family:'Cormorant Garamond',serif; font-size:1.55rem; font-weight:700; cursor:pointer; letter-spacing:0.01em; }
        .va-brand em { font-style:italic; color:#81c784; }
        .va-links { display:flex; gap:6px; margin-left:auto; }
        .va-links button, .va-links a { background:none; border:none; color:rgba(255,255,255,0.8); font-weight:600; font-size:0.88rem; padding:8px 14px; border-radius:10px; cursor:pointer; text-decoration:none; transition:all 0.2s; }
        .va-links button:hover, .va-links a:hover { color:#fff; background:rgba(255,255,255,0.1); }
        .va-nav-cta { display:flex; gap:10px; }
        .va-nav-cta .va-btn-ghost { padding:10px 18px; font-size:0.85rem; }
        .va-nav-cta .va-btn-primary { padding:10px 20px; font-size:0.85rem; box-shadow:none; }
        .va-burger { display:none; background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer; margin-left:auto; }
        .va-mobile-menu { display:none; flex-direction:column; gap:4px; max-width:1160px; margin:10px auto 0; background:rgba(6,20,9,0.97); border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:12px; }
        .va-mobile-menu button, .va-mobile-menu a { background:none; border:none; color:#fff; text-align:left; font-weight:600; font-size:0.95rem; padding:12px 14px; border-radius:10px; cursor:pointer; text-decoration:none; }
        .va-mobile-menu button:hover, .va-mobile-menu a:hover { background:rgba(255,255,255,0.1); }

        /* ── Hero ── */
        .va-hero { position:relative; min-height:100vh; display:flex; align-items:center; background:linear-gradient(150deg,#051407 0%,#0d2e12 50%,#07200d 100%); padding:130px 24px 80px; overflow:hidden; }
        .va-hero-glow { position:absolute; width:560px; height:560px; border-radius:50%; filter:blur(120px); opacity:0.35; pointer-events:none; }
        .va-glow-1 { background:#2e7d32; top:-160px; right:-100px; }
        .va-glow-2 { background:#1b5e20; bottom:-200px; left:-140px; }
        .va-hero-inner { position:relative; z-index:2; max-width:1160px; margin:0 auto; display:grid; grid-template-columns:1.05fr 0.95fr; gap:60px; align-items:center; width:100%; }
        .va-hero-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(129,199,132,0.12); border:1px solid rgba(129,199,132,0.35); border-radius:99px; padding:8px 18px; font-size:0.75rem; font-weight:700; color:#a5d6a7; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:22px; }
        .va-hero h1 { font-family:'Cormorant Garamond',serif; font-size:clamp(2.6rem,5.4vw,4.4rem); font-weight:700; color:#fff; line-height:1.08; margin-bottom:18px; }
        .va-hero h1 em { font-style:italic; color:#81c784; }
        .va-hero-sub { font-size:1.02rem; color:rgba(255,255,255,0.72); line-height:1.7; margin-bottom:30px; max-width:540px; }

        .va-search-bar { background:#fff; border-radius:18px; padding:10px; display:flex; gap:8px; align-items:center; box-shadow:0 24px 48px rgba(0,0,0,0.35); max-width:560px; }
        .va-search-select { flex:1; min-width:0; padding:12px 14px; border-radius:12px; border:1px solid #e4eae4; font-family:inherit; font-weight:600; font-size:0.85rem; color:#333; outline:none; background:#f7faf7; cursor:pointer; }
        .va-search-select:focus { border-color:#81c784; }
        .va-hero-actions { display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; }
        .va-hero-trust { display:flex; align-items:center; gap:12px; margin-top:30px; }
        .va-avatar-stack { display:flex; }
        .va-avatar-stack img { width:38px; height:38px; border-radius:50%; border:2px solid #0d2e12; margin-left:-10px; object-fit:cover; }
        .va-avatar-stack img:first-child { margin-left:0; }
        .va-hero-trust p { color:rgba(255,255,255,0.65); font-size:0.82rem; line-height:1.5; }
        .va-hero-trust strong { color:#fff; }

        /* Hero visual */
        .va-hero-visual { position:relative; }
        .va-visual-main { border-radius:28px; overflow:hidden; box-shadow:0 40px 80px rgba(0,0,0,0.45); border:1px solid rgba(255,255,255,0.15); transform:rotate(1.5deg); }
        .va-visual-main img { width:100%; height:460px; object-fit:cover; display:block; }
        .va-float { position:absolute; background:rgba(255,255,255,0.96); border-radius:16px; padding:14px 18px; box-shadow:0 16px 40px rgba(0,0,0,0.3); backdrop-filter:blur(8px); animation:va-bob 5s ease-in-out infinite; }
        .va-float strong { display:block; font-size:0.85rem; color:#16211a; }
        .va-float small { font-size:0.72rem; color:#7a8a7d; font-weight:600; }
        .va-float-1 { top:22px; left:-26px; display:flex; align-items:center; gap:8px; color:#2e7d32; font-weight:800; font-size:0.85rem; animation-delay:0.5s; }
        .va-float-2 { bottom:88px; right:-22px; }
        .va-float-3 { bottom:-20px; left:36px; animation-delay:1s; }
        @keyframes va-bob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }

        /* ── Section headers ── */
        .va-sec-head { text-align:center; max-width:640px; margin:0 auto 48px; }
        .va-eyebrow { color:#3fa34d; font-size:0.78rem; font-weight:800; text-transform:uppercase; letter-spacing:0.12em; }
        .va-sec-head h2, .va-sec-title { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4vw,2.7rem); font-weight:700; color:#14231a; margin-top:8px; line-height:1.15; }
        .va-sec-head p { color:#6b7c6e; font-size:0.95rem; margin-top:12px; line-height:1.65; }

        /* ── Stats ── */
        .va-stats { background:linear-gradient(135deg,#0d2e12,#123a18); padding:56px 24px; }
        .va-stats-inner { max-width:1080px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
        .va-stat { text-align:center; padding:28px 16px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:18px; transition:all 0.3s; }
        .va-stat:hover { background:rgba(255,255,255,0.09); transform:translateY(-3px); }
        .va-stat-icon { font-size:1.5rem; margin-bottom:8px; }
        .va-stat-num { font-family:'Cormorant Garamond',serif; font-size:2.3rem; font-weight:700; color:#a5d6a7; }
        .va-stat-label { font-size:0.72rem; font-weight:700; color:rgba(255,255,255,0.55); text-transform:uppercase; letter-spacing:0.06em; margin-top:4px; }

        /* ── Features ── */
        .va-features { max-width:1120px; margin:0 auto; padding:96px 24px; }
        .va-grid-features { display:grid; grid-template-columns:repeat(2,1fr); gap:22px; }
        .va-feature-card { background:#fff; border:1px solid #e8f0e8; padding:34px; border-radius:22px; transition:all 0.3s ease; position:relative; overflow:hidden; }
        .va-feature-card::after { content:''; position:absolute; top:0; left:0; width:100%; height:4px; background:linear-gradient(90deg,#3fa34d,#81c784); opacity:0; transition:opacity 0.3s; }
        .va-feature-card:hover { transform:translateY(-6px); box-shadow:0 20px 44px rgba(46,125,50,0.12); border-color:#c8e6c9; }
        .va-feature-card:hover::after { opacity:1; }
        .va-feature-icon { width:56px; height:56px; display:flex; align-items:center; justify-content:center; background:#eef7ee; border-radius:16px; font-size:1.6rem; margin-bottom:18px; }
        .va-feature-card h3 { font-size:1.12rem; font-weight:700; color:#14231a; margin-bottom:8px; }
        .va-feature-card p { font-size:0.9rem; color:#6b7c6e; line-height:1.65; }

        /* ── Carousel ── */
        .va-pets { max-width:1120px; margin:0 auto; padding:0 24px 96px; }
        .va-pets-head { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:26px; gap:16px; flex-wrap:wrap; }
        .va-pets-head h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4vw,2.6rem); color:#14231a; margin-top:6px; }
        .va-pets-head .va-link { background:none; border:none; color:#2e7d32; font-weight:700; font-size:0.9rem; cursor:pointer; padding:0; }
        .va-pets-head .va-link:hover { text-decoration:underline; }
        .va-carousel-inner { display:grid; grid-template-columns:1fr 1fr; border-radius:26px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.1); background:#fff; border:1px solid #e8ece8; }
        .va-car-img { position:relative; min-height:420px; }
        .va-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; transition:opacity 0.9s ease; }
        .va-img.on { opacity:1; }
        .va-car-badge { position:absolute; top:18px; left:18px; background:rgba(6,20,9,0.75); backdrop-filter:blur(6px); color:#fff; padding:6px 14px; border-radius:99px; font-size:0.72rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; }
        .va-arrow { position:absolute; top:50%; transform:translateY(-50%); width:42px; height:42px; border-radius:50%; border:none; background:rgba(255,255,255,0.92); color:#16211a; font-size:1.1rem; cursor:pointer; transition:all 0.2s; box-shadow:0 6px 16px rgba(0,0,0,0.2); z-index:3; }
        .va-arrow:hover { background:#2e7d32; color:#fff; }
        .va-arrow.left { left:16px; } .va-arrow.right { right:16px; }
        .va-carousel-info { padding:48px; display:flex; flex-direction:column; justify-content:center; }
        .va-health-tag { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:#e8f5e9; color:#2e7d32; border-radius:99px; font-size:0.75rem; font-weight:700; margin-bottom:14px; width:fit-content; }
        .va-carousel-info h3 { font-family:'Cormorant Garamond',serif; font-size:2.6rem; margin-bottom:4px; color:#14231a; }
        .va-pet-meta { color:#8a978c; font-size:0.85rem; font-weight:600; margin-bottom:16px; }
        .va-pet-desc { color:#555f58; font-size:0.95rem; line-height:1.7; margin-bottom:26px; }
        .va-pet-actions { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
        .va-dots { display:flex; gap:7px; }
        .va-dot { width:8px; height:8px; border-radius:99px; border:none; background:#cfd8cf; cursor:pointer; transition:all 0.3s; padding:0; }
        .va-dot.on { width:26px; background:#2e7d32; }

        /* ── How it works ── */
        .va-how { background:linear-gradient(150deg,#0d2e12,#081d0c); color:#fff; padding:96px 24px; position:relative; overflow:hidden; }
        .va-how .va-sec-head h2 { color:#fff; }
        .va-how .va-sec-head p { color:rgba(255,255,255,0.6); }
        .va-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; max-width:1060px; margin:0 auto; position:relative; }
        .va-step { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:20px; padding:34px 28px; transition:all 0.3s; position:relative; }
        .va-step:hover { background:rgba(255,255,255,0.09); transform:translateY(-4px); }
        .va-step-num { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#3fa34d,#81c784); color:#06130a; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:1rem; margin-bottom:18px; box-shadow:0 8px 20px rgba(63,163,77,0.35); }
        .va-step h3 { margin-bottom:10px; font-size:1.08rem; }
        .va-step p { color:rgba(255,255,255,0.6); font-size:0.88rem; line-height:1.65; }

        /* ── Testimonials ── */
        .va-test { padding:96px 24px; background:#f6faf6; }
        .va-test-card { background:#fff; max-width:700px; margin:0 auto; padding:46px 44px; border-radius:24px; text-align:center; border:1px solid #e6efe6; box-shadow:0 16px 44px rgba(0,0,0,0.05); position:relative; }
        .va-stars { color:#f5b301; letter-spacing:3px; margin-bottom:18px; font-size:1rem; }
        .va-test-body { animation:va-pop 0.5s ease both; }
        .va-test-text { font-family:'Cormorant Garamond',serif; font-style:italic; color:#2c3a30; font-size:1.35rem; line-height:1.5; margin-bottom:22px; }
        .va-test-card img { width:64px; height:64px; border-radius:50%; margin-bottom:12px; border:3px solid #e8f5e9; object-fit:cover; }
        .va-test-name { font-weight:700; color:#2e7d32; }
        .va-test-loc { font-size:0.8rem; color:#8a978c; margin-bottom:22px; }
        @keyframes va-pop { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .va-test-nav { display:flex; align-items:center; justify-content:center; gap:18px; margin-top:26px; }
        .va-test-nav .va-arrow { position:static; transform:none; width:38px; height:38px; background:#fff; border:1px solid #e0e8e0; box-shadow:none; }
        .va-test-nav .va-arrow:hover { background:#2e7d32; color:#fff; }

        /* ── CTA ── */
        .va-cta { padding:0 24px 96px; background:#f6faf6; }
        .va-cta-card { max-width:1060px; margin:0 auto; background:linear-gradient(135deg,#123a18,#0d2e12); border-radius:28px; padding:70px 40px; text-align:center; position:relative; overflow:hidden; }
        .va-cta-card::before { content:'🐾'; position:absolute; font-size:11rem; opacity:0.06; top:-30px; left:-20px; }
        .va-cta-card::after { content:'🐾'; position:absolute; font-size:9rem; opacity:0.06; bottom:-40px; right:0; }
        .va-cta-card h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4.5vw,3rem); color:#fff; margin-bottom:14px; position:relative; }
        .va-cta-card p { color:rgba(255,255,255,0.65); max-width:520px; margin:0 auto 30px; font-size:0.98rem; line-height:1.65; position:relative; }
        .va-cta-actions { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; position:relative; }

        /* ── Footer ── */
        .va-footer { background:#051407; color:rgba(255,255,255,0.55); padding:44px 24px; text-align:center; font-size:0.85rem; }
        .va-footer .va-brand { font-size:1.3rem; }
        .va-footer-links { display:flex; gap:22px; justify-content:center; margin:16px 0; flex-wrap:wrap; }
        .va-footer-links button, .va-footer-links a { background:none; border:none; color:rgba(255,255,255,0.55); font-size:0.85rem; cursor:pointer; text-decoration:none; transition:color 0.2s; }
        .va-footer-links button:hover, .va-footer-links a:hover { color:#81c784; }

        /* ── Responsive ── */
        @media(max-width:960px) {
          .va-hero-inner { grid-template-columns:1fr; gap:48px; }
          .va-visual-main img { height:340px; }
          .va-float-2 { right:8px; }
          .va-float-1 { left:8px; }
          .va-links, .va-nav-cta { display:none; }
          .va-burger { display:block; }
          .va-mobile-menu.open { display:flex; }
          .va-stats-inner { grid-template-columns:repeat(2,1fr); }
        }
        @media(max-width:820px) {
          .va-grid-features, .va-steps { grid-template-columns:1fr; }
          .va-carousel-inner { grid-template-columns:1fr; }
          .va-car-img { min-height:280px; }
          .va-carousel-info { padding:32px 26px; }
        }
        @media(max-width:540px) {
          .va-stats-inner { grid-template-columns:1fr 1fr; }
          .va-search-bar { flex-direction:column; align-items:stretch; }
          .va-hero { padding-top:110px; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <header className={scrolled ? "va-nav va-nav-solid" : "va-nav"}>
        <div className="va-nav-inner">
          <button className="va-brand" onClick={() => navigate("/")}>🐾 Vet<em>Adopt</em></button>
          <nav className="va-links">
            <button onClick={() => navigate("/adopt")}>Adopt</button>
            <button onClick={() => navigate("/petmatchmaker")}>Matchmaker</button>
            <a href="#how">How It Works</a>
            <a href="#stories">Stories</a>
          </nav>
          <div className="va-nav-cta">
            <button className="va-btn-ghost" onClick={() => navigate("/login")}>Sign In</button>
            <button className="va-btn-primary" onClick={() => navigate("/adopt")}>Adopt Now</button>
          </div>
          <button className="va-burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">{menuOpen ? "✕" : "☰"}</button>
        </div>
        <div className={menuOpen ? "va-mobile-menu open" : "va-mobile-menu"}>
          <button onClick={() => go("/adopt")}>Adopt</button>
          <button onClick={() => go("/petmatchmaker")}>Matchmaker</button>
          <a href="#how" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#stories" onClick={() => setMenuOpen(false)}>Stories</a>
          <button onClick={() => go("/login")}>Sign In</button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="va-hero">
        <div className="va-hero-glow va-glow-1" />
        <div className="va-hero-glow va-glow-2" />
        <div className="va-hero-inner">
          <div>
            <span className="va-hero-badge">🩺 Cebu&apos;s Vet-Verified Adoption Platform</span>
            <h1>Every pet deserves a <em>healthy, loving</em> home.</h1>
            <p className="va-hero-sub">
              Connecting verified shelters, local clinics, and loving homes across Metro Cebu. Every animal comes with full health screening and lifetime digital records.
            </p>

            <div className="va-search-bar">
              <select className="va-search-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Pet type">
                <option value="all">🐾 All Pet Types</option>
                <option value="dog">🐶 Dogs</option>
                <option value="cat">🐱 Cats</option>
              </select>
              <select className="va-search-select" value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Location">
                <option value="all">📍 All Metro Cebu</option>
                <option value="cebu">Cebu City</option>
                <option value="mandaue">Mandaue City</option>
                <option value="lapulapu">Lapu-Lapu City</option>
              </select>
              <button className="va-btn-primary" onClick={search}>Search</button>
            </div>

            <div className="va-hero-actions">
              <button className="va-btn-ghost" onClick={() => navigate("/petmatchmaker")}>🎯 Take the Matchmaker Quiz</button>
            </div>

            <div className="va-hero-trust">
              <div className="va-avatar-stack">
                <img src="https://randomuser.me/api/portraits/women/68.jpg" alt="Adopter" />
                <img src="https://randomuser.me/api/portraits/men/72.jpg" alt="Adopter" />
                <img src="https://randomuser.me/api/portraits/women/65.jpg" alt="Adopter" />
              </div>
              <p><strong>5,200+ families</strong> across Metro Cebu found their companion through VetAdopt</p>
            </div>
          </div>

          <div className="va-hero-visual va-reveal">
            <div className="va-visual-main">
              <img src={PETS[0].img} alt="Happy adopted dog" />
            </div>
            <div className="va-float va-float-1">✅ 100% Vetted</div>
            <div className="va-float va-float-2">
              <strong>🛡️ Verified Shelter</strong>
              <small>Cebu City Animal Care Center</small>
            </div>
            <div className="va-float va-float-3">
              <strong>📅 Next check-up</strong>
              <small>Rabies booster · Oct 12</small>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="va-stats">
        <div className="va-stats-inner">
          {STATS.map((s) => (
            <CountUp key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="va-features" id="features">
        <div className="va-sec-head va-reveal">
          <span className="va-eyebrow">System Core Features</span>
          <h2>Bridging the Gap in Pet Rehoming</h2>
          <p>VetAdopt integrates clinical records directly into the adoption workflow to ensure safe and accountable pet transitions.</p>
        </div>
        <div className="va-grid-features">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`va-feature-card va-reveal va-d${i + 1}`}>
              <span className="va-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED RESIDENTS ── */}
      <section className="va-pets" id="pets">
        <div className="va-pets-head va-reveal">
          <div>
            <span className="va-eyebrow">Ready For Adoption</span>
            <h2>Featured Vetted Residents</h2>
          </div>
          <button className="va-link" onClick={() => navigate("/adopt")}>View all pets →</button>
        </div>

        <div className="va-carousel-inner va-reveal" onMouseEnter={pauseCarousel} onMouseLeave={resumeCarousel}>
          <div className="va-car-img">
            {PETS.map((p, i) => (
              <img key={p.id} src={p.img} alt={p.name} className={i === petIdx ? "va-img on" : "va-img"} />
            ))}
            <span className="va-car-badge">{pet.badge}</span>
            <button className="va-arrow left" onClick={() => goToPet(-1)} aria-label="Previous pet">←</button>
            <button className="va-arrow right" onClick={() => goToPet(1)} aria-label="Next pet">→</button>
          </div>
          <div className="va-carousel-info">
            <span className="va-health-tag">✓ {pet.healthScore}</span>
            <h3>{pet.name}</h3>
            <p className="va-pet-meta">{pet.type} · {pet.age}</p>
            <p className="va-pet-desc">{pet.desc}</p>
            <div className="va-pet-actions">
              <button className="va-btn-primary" onClick={() => navigate("/adopt")}>View Profile & Medical Log →</button>
              <div className="va-dots">
                {PETS.map((p, i) => (
                  <button key={p.id} className={i === petIdx ? "va-dot on" : "va-dot"} onClick={() => goToPetDot(i)} aria-label={`Go to ${p.name}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="va-how" id="how">
        <div className="va-sec-head va-reveal">
          <span className="va-eyebrow" style={{ color: "#81c784" }}>The Process</span>
          <h2>How VetAdopt Operates</h2>
          <p>A structured process designed for transparency and animal safety — from intake to lifelong follow-up.</p>
        </div>
        <div className="va-steps">
          <div className="va-step va-reveal va-d1">
            <div className="va-step-num">1</div>
            <h3>Screening & Verification</h3>
            <p>Shelters upload medical status, vaccination history, and behavioral assessments verified by partner vets.</p>
          </div>
          <div className="va-step va-reveal va-d2">
            <div className="va-step-num">2</div>
            <h3>Match & Application</h3>
            <p>Adopters complete the lifestyle matchmaker and submit a digital application form online.</p>
          </div>
          <div className="va-step va-reveal va-d3">
            <div className="va-step-num">3</div>
            <h3>Adoption & Follow-up</h3>
            <p>Finalize adoption with a clear health passport and automated reminders for follow-up vet checks.</p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="va-test" id="stories">
        <div className="va-sec-head va-reveal">
          <span className="va-eyebrow">Community Impact</span>
          <h2>Stories From Happy Adopters</h2>
        </div>
        <div className="va-test-card va-reveal">
          <div className="va-stars">★★★★★</div>
          <div className="va-test-body" key={test.id}>
            <p className="va-test-text">"{test.text}"</p>
            <img src={test.img} alt={test.name} />
            <div className="va-test-name">{test.name}</div>
            <div className="va-test-loc">{test.location}</div>
          </div>
          <div className="va-test-nav">
            <button className="va-arrow" onClick={() => setTestIdx((testIdx - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)} aria-label="Previous story">←</button>
            <div className="va-dots">
              {TESTIMONIALS.map((t, i) => (
                <button key={t.id} className={i === testIdx ? "va-dot on" : "va-dot"} onClick={() => setTestIdx(i)} aria-label={`Story ${i + 1}`} />
              ))}
            </div>
            <button className="va-arrow" onClick={() => setTestIdx((testIdx + 1) % TESTIMONIALS.length)} aria-label="Next story">→</button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="va-cta">
        <div className="va-cta-card va-reveal">
          <h2>Ready to meet your new best friend?</h2>
          <p>Browse vet-verified pets near you, or let the Matchmaker Quiz find the perfect companion for your lifestyle.</p>
          <div className="va-cta-actions">
            <button className="va-btn-primary" onClick={() => navigate("/adopt")}>Browse Adoptable Pets 🐾</button>
            <button className="va-btn-ghost" onClick={() => navigate("/petmatchmaker")}>Take the Matchmaker Quiz 🎯</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="va-footer">
        <button className="va-brand" onClick={() => navigate("/")}>🐾 Vet<em>Adopt</em></button>
        <div className="va-footer-links">
          <button onClick={() => navigate("/adopt")}>Adopt</button>
          <button onClick={() => navigate("/petmatchmaker")}>Matchmaker</button>
          <a href="#how">How It Works</a>
          <a href="#stories">Stories</a>
        </div>
        <p>© 2026 VetAdopt · Veterinary-backed pet adoption in Metro Cebu 🐾</p>
      </footer>
    </div>
  );
}