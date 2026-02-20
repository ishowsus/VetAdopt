import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TEAM = [
  { id: 1, name: "Nadine Cruz", role: "Frontend Developer", emoji: "💻", img: "https://randomuser.me/api/portraits/women/68.jpg", bio: "Crafts beautiful, accessible interfaces with a passion for animals and clean code." },
  { id: 2, name: "Aaron Nash", role: "Backend Developer", emoji: "⚙️", img: "https://randomuser.me/api/portraits/men/72.jpg", bio: "Architects the systems that keep VetAdopt fast, secure, and reliable." },
  { id: 3, name: "Sophia Lee", role: "UI/UX Designer", emoji: "🎨", img: "https://randomuser.me/api/portraits/women/65.jpg", bio: "Designs every pixel with empathy — for both humans and animals." },
  { id: 4, name: "Liam Kim", role: "Fullstack Developer", emoji: "🚀", img: "https://randomuser.me/api/portraits/men/65.jpg", bio: "Bridges front and back, shipping features that make adoption effortless." },
];

const VALUES = [
  { icon: "🏠", title: "Quick Listing", desc: "Shelters and private owners can list a pet in under 2 minutes with our guided form and photo uploader." },
  { icon: "🩺", title: "Vet Verified", desc: "Direct integration with Cebu clinics ensures every pet's health history is honest, current, and complete." },
  { icon: "🤝", title: "Community First", desc: "10,000+ animal lovers across the Philippines support and guide new adopters through every step." },
];

const MILESTONES = [
  { year: "2021", title: "VetAdopt Founded", desc: "Started as a weekend project by four friends who wanted to make pet adoption in Cebu simpler." },
  { year: "2022", title: "First 500 Adoptions", desc: "Reached our first major milestone and partnered with 12 shelters across Cebu City." },
  { year: "2023", title: "Vet Network Launch", desc: "Integrated real-time vet booking so adopters could schedule checkups without leaving the platform." },
  { year: "2024", title: "5,000+ Happy Homes", desc: "Expanded to Mandaue and Lapu-Lapu, and launched the PetMatchmaker quiz." },
];

export default function About() {
  const navigate = useNavigate();

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="au-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes heroIn { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes lineGrow { from{height:0} to{height:100%} }

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .au-root { font-family:'Plus Jakarta Sans',sans-serif; color:#1a1a1a; overflow-x:hidden; background:#fff; }

        /* ── Reveal ── */
        .reveal { opacity:0; transform:translateY(28px); transition:opacity 0.7s ease, transform 0.7s ease; }
        .reveal.revealed { opacity:1; transform:translateY(0); }
        .reveal-d1 { transition-delay:0.08s; }
        .reveal-d2 { transition-delay:0.18s; }
        .reveal-d3 { transition-delay:0.28s; }
        .reveal-d4 { transition-delay:0.38s; }

        /* ── Hero ── */
        .au-hero {
          position:relative; min-height:82vh; display:flex; align-items:flex-end;
          padding:0 0 80px; overflow:hidden;
          background:linear-gradient(165deg,#071a09 0%,#0d2e12 55%,#0a200e 100%);
        }
        .au-hero-bg {
          position:absolute; inset:0;
          background:url('https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=50&w=1400') center/cover no-repeat;
          opacity:0.14;
        }
        .au-hero-gradient {
          position:absolute; inset:0;
          background:linear-gradient(to top,rgba(7,26,9,0.98) 0%,rgba(7,26,9,0.5) 50%,transparent 100%);
        }
        .au-hero-inner {
          position:relative; z-index:2; max-width:1100px; margin:0 auto; padding:0 48px;
          width:100%;
        }
        .au-hero-eyebrow {
          display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.07);
          border:1px solid rgba(255,255,255,0.14); border-radius:99px;
          padding:7px 18px; font-size:0.72rem; font-weight:700; color:rgba(255,255,255,0.55);
          letter-spacing:0.12em; text-transform:uppercase; margin-bottom:24px;
          animation:heroIn 0.7s 0.1s ease both;
        }
        .au-hero h1 {
          font-family:'Cormorant Garamond',serif; font-size:clamp(3rem,6.5vw,5.5rem);
          font-weight:700; color:white; line-height:1.07;
          animation:heroIn 0.7s 0.25s ease both; max-width:700px;
        }
        .au-hero h1 em { font-style:italic; color:#81c784; }
        .au-hero-sub {
          font-size:1rem; color:rgba(255,255,255,0.5); line-height:1.7;
          max-width:480px; margin-top:16px;
          animation:heroIn 0.7s 0.4s ease both;
        }
        .au-hero-scroll {
          display:flex; align-items:center; gap:12px; margin-top:40px;
          color:rgba(255,255,255,0.3); font-size:0.7rem; font-weight:700;
          letter-spacing:0.12em; text-transform:uppercase;
          animation:heroIn 0.7s 0.55s ease both;
        }
        .au-hero-line { width:40px; height:1px; background:rgba(255,255,255,0.2); }

        /* ── Story ── */
        .au-story { max-width:1100px; margin:0 auto; padding:100px 48px; }
        .au-story-grid { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
        .au-tag { font-size:0.7rem; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#388e3c; margin-bottom:12px; }
        .au-heading { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4vw,3.2rem); font-weight:700; color:#1a2e1a; line-height:1.15; }
        .au-heading em { font-style:italic; color:#2e7d32; }
        .au-body { font-size:0.95rem; color:#666; line-height:1.8; margin-top:16px; }
        .au-story-img-wrap { position:relative; border-radius:24px; overflow:hidden; aspect-ratio:4/3; }
        .au-story-img-wrap img { width:100%; height:100%; object-fit:cover; }
        .au-story-img-badge {
          position:absolute; bottom:20px; left:20px; background:white; border-radius:14px;
          padding:14px 18px; box-shadow:0 8px 24px rgba(0,0,0,0.15);
        }
        .au-story-img-badge-num { font-family:'Cormorant Garamond',serif; font-size:1.8rem; font-weight:700; color:#1b5e20; line-height:1; }
        .au-story-img-badge-label { font-size:0.7rem; font-weight:700; color:#9aaa9a; text-transform:uppercase; letter-spacing:0.07em; }

        /* ── Values ── */
        .au-values { background:#f8fdf8; padding:100px 48px; }
        .au-values-inner { max-width:1100px; margin:0 auto; }
        .au-values-header { display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:end; margin-bottom:60px; }
        .au-values-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        .au-value-card {
          background:white; border-radius:24px; padding:36px 32px;
          border:1px solid #e8f4e8; transition:transform 0.25s, box-shadow 0.25s;
        }
        .au-value-card:hover { transform:translateY(-6px); box-shadow:0 20px 48px rgba(46,125,50,0.1); }
        .au-value-icon { font-size:2.2rem; margin-bottom:16px; display:block; }
        .au-value-title { font-weight:800; font-size:1rem; color:#1a2e1a; margin-bottom:8px; }
        .au-value-desc { font-size:0.86rem; color:#888; line-height:1.65; }

        /* ── Timeline ── */
        .au-timeline { max-width:800px; margin:0 auto; padding:100px 48px; }
        .au-timeline-header { text-align:center; margin-bottom:64px; }
        .au-timeline-track { position:relative; }
        .au-timeline-line {
          position:absolute; left:16px; top:0; width:2px; background:#e8f4e8;
          height:100%; border-radius:99px;
        }
        .au-milestone { display:flex; gap:32px; margin-bottom:48px; position:relative; }
        .au-milestone-dot {
          width:34px; height:34px; border-radius:50%; background:#2e7d32;
          flex-shrink:0; display:flex; align-items:center; justify-content:center;
          font-size:0.7rem; font-weight:900; color:white; position:relative; z-index:1;
          box-shadow:0 0 0 6px #f8fdf8;
        }
        .au-milestone-year { font-size:0.72rem; font-weight:800; color:#388e3c; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:4px; }
        .au-milestone-title { font-weight:800; font-size:1rem; color:#1a2e1a; margin-bottom:6px; }
        .au-milestone-desc { font-size:0.86rem; color:#888; line-height:1.6; }

        /* ── Team ── */
        .au-team { background:linear-gradient(160deg,#071a09,#0e2912); padding:100px 48px; }
        .au-team-inner { max-width:1100px; margin:0 auto; }
        .au-team-header { text-align:center; margin-bottom:60px; }
        .au-team-header h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4vw,3rem); font-weight:700; color:white; }
        .au-team-header p { color:rgba(255,255,255,0.45); font-size:0.9rem; margin-top:8px; }
        .au-team-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .au-member {
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09);
          border-radius:24px; padding:32px 24px; text-align:center;
          transition:background 0.25s, transform 0.25s;
        }
        .au-member:hover { background:rgba(255,255,255,0.09); transform:translateY(-4px); }
        .au-member-img {
          width:80px; height:80px; border-radius:50%; object-fit:cover;
          margin:0 auto 14px; border:3px solid rgba(255,255,255,0.15); display:block;
        }
        .au-member-name { font-weight:800; font-size:0.95rem; color:white; margin-bottom:4px; }
        .au-member-role { font-size:0.75rem; color:#81c784; font-weight:700; margin-bottom:10px; }
        .au-member-bio { font-size:0.78rem; color:rgba(255,255,255,0.4); line-height:1.6; }

        /* ── CTA ── */
        .au-cta {
          padding:120px 24px; text-align:center;
          background:linear-gradient(135deg,#f1f8f1,#e8f5e9); position:relative; overflow:hidden;
        }
        .au-cta::before { content:'🐾'; position:absolute; font-size:22rem; opacity:0.04; right:-60px; top:-60px; pointer-events:none; line-height:1; }
        .au-cta h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(2.2rem,5vw,3.8rem); font-weight:700; color:#1a2e1a; line-height:1.15; margin-bottom:14px; }
        .au-cta h2 em { font-style:italic; color:#2e7d32; }
        .au-cta p { font-size:0.95rem; color:#888; margin-bottom:36px; }
        .au-cta-btns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
        .au-btn-primary {
          padding:15px 36px; border-radius:99px; border:none;
          background:linear-gradient(135deg,#2e7d32,#1b5e20); color:white;
          font-size:0.95rem; font-weight:800; cursor:pointer;
          font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.25s;
          box-shadow:0 8px 24px rgba(46,125,50,0.3);
        }
        .au-btn-primary:hover { transform:translateY(-2px); box-shadow:0 14px 32px rgba(46,125,50,0.4); }
        .au-btn-ghost {
          padding:15px 36px; border-radius:99px;
          border:2px solid #c8e6c9; background:white; color:#2e7d32;
          font-size:0.95rem; font-weight:800; cursor:pointer;
          font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.25s;
        }
        .au-btn-ghost:hover { background:#f1f8f1; }

        /* ── Responsive ── */
        @media(max-width:900px) {
          .au-story-grid { grid-template-columns:1fr; gap:40px; }
          .au-values-header { grid-template-columns:1fr; }
          .au-values-grid { grid-template-columns:1fr; }
          .au-team-grid { grid-template-columns:repeat(2,1fr); }
          .au-story, .au-values, .au-timeline, .au-team, .au-cta { padding-left:24px; padding-right:24px; }
          .au-hero-inner { padding:0 24px; }
        }
        @media(max-width:540px) {
          .au-team-grid { grid-template-columns:1fr; }
          .au-timeline { padding:60px 24px; }
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="au-hero">
        <div className="au-hero-bg" />
        <div className="au-hero-gradient" />
        <div className="au-hero-inner">
          <div className="au-hero-eyebrow">🐾 Our Story</div>
          <h1>Built for animals.<br /><em>Driven by love.</em></h1>
          <p className="au-hero-sub">We're a small team with a big mission — to make pet adoption in Cebu transparent, joyful, and accessible to everyone.</p>
          <div className="au-hero-scroll"><div className="au-hero-line" /> Scroll to explore</div>
        </div>
      </section>

      {/* ── Story ── */}
      <section className="au-story">
        <div className="au-story-grid">
          <div className="reveal">
            <div className="au-tag">How we started</div>
            <h2 className="au-heading">A bridge between<br /><em>shelters and families</em></h2>
            <p className="au-body">
              VetAdopt began in 2021 when four friends in Cebu noticed how hard it was to find reliable information about pets available for adoption. Shelter lists were outdated, health records were scattered, and the process felt overwhelming for first-time adopters.
            </p>
            <p className="au-body" style={{ marginTop: "14px" }}>
              We built VetAdopt to change that — combining real-time shelter listings, vet-verified health records, and a community of animal lovers into one seamless platform. Today, over 5,200 pets have found their forever homes through us.
            </p>
          </div>
          <div className="reveal reveal-d2">
            <div className="au-story-img-wrap">
              <img src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=800" alt="Our mission" />
              <div className="au-story-img-badge">
                <div className="au-story-img-badge-num">5,200+</div>
                <div className="au-story-img-badge-label">Pets Rehomed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="au-values">
        <div className="au-values-inner">
          <div className="au-values-header">
            <div className="reveal">
              <div className="au-tag">What we believe in</div>
              <h2 className="au-heading">Our core <em>values</em></h2>
            </div>
            <p className="au-body reveal reveal-d2">
              Every decision we make — from design to policy — is guided by one question: does this make life better for animals and the people who love them?
            </p>
          </div>
          <div className="au-values-grid">
            {VALUES.map((v, i) => (
              <div key={v.title} className={`au-value-card reveal reveal-d${i + 1}`}>
                <span className="au-value-icon">{v.icon}</span>
                <div className="au-value-title">{v.title}</div>
                <p className="au-value-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="au-timeline">
        <div className="au-timeline-header reveal">
          <div className="au-tag">Our journey</div>
          <h2 className="au-heading">How far we've come</h2>
        </div>
        <div className="au-timeline-track">
          <div className="au-timeline-line" />
          {MILESTONES.map((m, i) => (
            <div key={m.year} className={`au-milestone reveal reveal-d${(i % 4) + 1}`}>
              <div className="au-milestone-dot">✓</div>
              <div>
                <div className="au-milestone-year">{m.year}</div>
                <div className="au-milestone-title">{m.title}</div>
                <p className="au-milestone-desc">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Team ── */}
      <section className="au-team">
        <div className="au-team-inner">
          <div className="au-team-header reveal">
            <h2>The humans behind the paws</h2>
            <p>A passionate team of developers and designers who believe technology can change lives — including animals'.</p>
          </div>
          <div className="au-team-grid">
            {TEAM.map((m, i) => (
              <div key={m.id} className={`au-member reveal reveal-d${i + 1}`}>
                <img className="au-member-img" src={m.img} alt={m.name} />
                <div className="au-member-name">{m.name}</div>
                <div className="au-member-role">{m.emoji} {m.role}</div>
                <p className="au-member-bio">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="au-cta">
        <h2 className="reveal">Ready to make a<br /><em>difference?</em></h2>
        <p className="reveal">Browse pets waiting for a home, or support our mission with a donation.</p>
        <div className="au-cta-btns reveal">
          <button className="au-btn-primary" onClick={() => navigate("/adopt")}>Explore Pets →</button>
          <button className="au-btn-ghost" onClick={() => navigate("/donate")}>Support Us 🐾</button>
        </div>
      </section>
    </div>
  );
}