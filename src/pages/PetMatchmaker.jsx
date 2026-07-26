import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─── Quiz Data ────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 1,
    emoji: "🏠",
    text: "What's your living situation?",
    options: [
      { text: "🏢 Apartment or condo", score: { cat: 3, dog: 1, rabbit: 3, fish: 3 } },
      { text: "🏡 House with a yard", score: { cat: 2, dog: 3, rabbit: 2, fish: 1 } },
      { text: "🏘️ Small house, no yard", score: { cat: 3, dog: 2, rabbit: 3, fish: 2 } },
    ],
  },
  {
    id: 2,
    emoji: "⚡",
    text: "How active is your daily lifestyle?",
    options: [
      { text: "🛋️ Homebody — I love relaxing", score: { cat: 3, dog: 1, rabbit: 2, fish: 3 } },
      { text: "🚶 Moderate — occasional walks", score: { cat: 2, dog: 2, rabbit: 2, fish: 2 } },
      { text: "🏃 Very active — I love the outdoors", score: { cat: 1, dog: 3, rabbit: 1, fish: 1 } },
    ],
  },
  {
    id: 3,
    emoji: "⏰",
    text: "How many hours is the pet alone daily?",
    options: [
      { text: "🏠 Rarely — I'm home most of the day", score: { cat: 2, dog: 3, rabbit: 2, fish: 2 } },
      { text: "🕓 4–8 hours", score: { cat: 3, dog: 2, rabbit: 2, fish: 3 } },
      { text: "🌙 8+ hours", score: { cat: 3, dog: 1, rabbit: 1, fish: 3 } },
    ],
  },
  {
    id: 4,
    emoji: "💸",
    text: "What's your monthly pet budget?",
    options: [
      { text: "💰 Minimal — keep it affordable", score: { cat: 2, dog: 1, rabbit: 2, fish: 3 } },
      { text: "💳 Moderate — I can manage regular costs", score: { cat: 3, dog: 2, rabbit: 3, fish: 2 } },
      { text: "🤑 Generous — my pet gets the best", score: { cat: 2, dog: 3, rabbit: 2, fish: 1 } },
    ],
  },
  {
    id: 5,
    emoji: "👨‍👩‍👧",
    text: "Who else lives in your home?",
    options: [
      { text: "🙋 Just me", score: { cat: 3, dog: 2, rabbit: 2, fish: 3 } },
      { text: "👫 Partner or roommates", score: { cat: 2, dog: 3, rabbit: 2, fish: 2 } },
      { text: "👶 Kids in the household", score: { cat: 1, dog: 3, rabbit: 1, fish: 2 } },
    ],
  },
  {
    id: 6,
    emoji: "🤗",
    text: "What kind of bond do you want?",
    options: [
      { text: "🧘 Calm company, no demands", score: { cat: 3, dog: 1, rabbit: 2, fish: 3 } },
      { text: "🤝 Loyal companion, always there", score: { cat: 2, dog: 3, rabbit: 2, fish: 1 } },
      { text: "👀 Something unique to observe", score: { cat: 1, dog: 1, rabbit: 3, fish: 3 } },
    ],
  },
];

// ─── Result Data ──────────────────────────────────────────────────────────────
const RESULTS = {
  dog: {
    emoji: "🐶",
    name: "Dog",
    tagline: "Your loyal best friend",
    color: "#e65100",
    light: "#fff3e0",
    description:
      "You're energetic, social, and crave a deep bond. A dog matches your lifestyle perfectly — ready for adventures, cuddles, and unconditional love every single day.",
    traits: ["Loyal & Affectionate", "Great with Families", "Loves Outdoor Time"],
    care: ["Daily walks needed", "Regular grooming", "Vet check-ups"],
  },
  cat: {
    emoji: "🐱",
    name: "Cat",
    tagline: "Independent & charming",
    color: "#6a1b9a",
    light: "#f3e5f5",
    description:
      "You value your space and peace, but still want warm companionship. A cat will curl up beside you on your terms — low-maintenance, endlessly entertaining, and quietly devoted.",
    traits: ["Independent Spirit", "Low Maintenance", "Apartment Friendly"],
    care: ["Clean litter box daily", "Annual vet visits", "Enrichment toys"],
  },
  rabbit: {
    emoji: "🐰",
    name: "Rabbit",
    tagline: "Gentle & surprisingly social",
    color: "#c62828",
    light: "#ffebee",
    description:
      "You're thoughtful and appreciate gentle companionship. Rabbits are curious, affectionate, and quietly joyful — perfect for someone who wants a unique pet with real personality.",
    traits: ["Quiet & Gentle", "Very Clean", "Surprisingly Playful"],
    care: ["Fresh hay & veggies daily", "Bunny-proof your space", "Lots of floor time"],
  },
  fish: {
    emoji: "🐠",
    name: "Fish",
    tagline: "Peaceful & beautiful",
    color: "#0277bd",
    light: "#e1f5fe",
    description:
      "You love calm, beauty, and a stress-free lifestyle. A fish offers a stunning living display that's soothing to watch — ideal for busy or minimalist households.",
    traits: ["Zero Noise", "Stress-Relieving", "Space Efficient"],
    care: ["Weekly water changes", "Balanced feeding", "Tank maintenance"],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PetMatchmaker() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = intro
  const [questionIndex, setQuestionIndex] = useState(0);
  const [scores, setScores] = useState({ dog: 0, cat: 0, rabbit: 0, fish: 0 });
  const [result, setResult] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const total = QUESTIONS.length;
  const progress = step === 1 ? ((questionIndex) / total) * 100 : step === 2 ? 100 : 0;

  const handleAnswer = (score, idx) => {
    if (animating) return;
    setSelectedOption(idx);
    setAnimating(true);

    setTimeout(() => {
      const newScores = {
        dog: scores.dog + score.dog,
        cat: scores.cat + score.cat,
        rabbit: scores.rabbit + score.rabbit,
        fish: scores.fish + score.fish,
      };
      setScores(newScores);
      setSelectedOption(null);

      if (questionIndex < QUESTIONS.length - 1) {
        setQuestionIndex(questionIndex + 1);
      } else {
        const winner = Object.keys(newScores).reduce((a, b) =>
          newScores[a] > newScores[b] ? a : b
        );
        setResult(winner);
        setStep(2);
      }
      setAnimating(false);
    }, 380);
  };

  const restart = () => {
    setStep(0);
    setQuestionIndex(0);
    setScores({ dog: 0, cat: 0, rabbit: 0, fish: 0 });
    setResult(null);
    setSelectedOption(null);
  };

  const res = result ? RESULTS[result] : null;

  return (
    <div className="pm-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap');
        @keyframes floatUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes popIn { 0% { opacity:0; transform:scale(0.85) } 100% { opacity:1; transform:scale(1) } }
        @keyframes pulse { 0%,100% { transform:scale(1) } 50% { transform:scale(1.06) } }
        @keyframes shimmer { 0% { background-position:200% center } 100% { background-position:-200% center } }
        @keyframes barGrow { from { width:0 } }
        @keyframes bounce { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }
        @keyframes fadeSlide { from { opacity:0; transform:translateX(30px) } to { opacity:1; transform:translateX(0) } }

        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }

        .pm-root {
          min-height: 100vh;
          background: radial-gradient(ellipse at 20% 50%, #e8f5e9 0%, #f9fbe7 40%, #e3f2fd 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 24px 16px; font-family: 'Nunito', sans-serif;
          position: relative; overflow: hidden;
        }
        .pm-root::before {
          content: '🐾'; position: fixed; font-size: 18rem; opacity: 0.03;
          top: -40px; right: -60px; pointer-events: none; line-height:1;
        }

        .pm-card {
          background: white; width: 100%; max-width: 560px;
          border-radius: 32px; overflow: hidden;
          box-shadow: 0 30px 80px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06);
          animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
        }

        /* ── Header band ── */
        .pm-header {
          background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
          padding: 28px 36px 22px;
          position: relative; overflow: hidden;
        }
        .pm-header::after {
          content:''; position:absolute; bottom:-20px; left:0; right:0; height:40px;
          background: white; border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        }
        .pm-header-top { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
        .pm-logo { font-size:1.6rem; animation: bounce 2.5s ease-in-out infinite; }
        .pm-title {
          font-family: 'Playfair Display', serif; font-size:1.25rem;
          color: white; font-weight: 900; letter-spacing: -0.3px;
        }
        .pm-subtitle { font-size: 0.78rem; color: rgba(255,255,255,0.7); font-weight:600; }

        /* ── Progress ── */
        .pm-progress-wrap { margin-top: 4px; }
        .pm-progress-track {
          height: 7px; background: rgba(255,255,255,0.2); border-radius: 99px; overflow:hidden;
        }
        .pm-progress-fill {
          height:100%; background: linear-gradient(90deg,#a5d6a7,#69f0ae);
          border-radius:99px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
          animation: barGrow 0.5s ease;
        }
        .pm-progress-label {
          font-size:0.72rem; color:rgba(255,255,255,0.65); margin-top:5px;
          font-weight:700; text-align:right;
        }

        /* ── Body ── */
        .pm-body { padding: 36px 36px 40px; }

        /* ── Intro ── */
        .pm-intro { text-align:center; animation: floatUp 0.5s ease; }
        .pm-intro-emoji { font-size:4.5rem; animation: pulse 2s ease-in-out infinite; margin-bottom:16px; display:block; }
        .pm-intro h2 {
          font-family:'Playfair Display',serif; font-size:1.8rem; color:#1b5e20;
          font-weight:900; line-height:1.2; margin-bottom:10px;
        }
        .pm-intro p { color:#666; font-size:0.92rem; line-height:1.6; margin-bottom:28px; }
        .pm-pets-preview { display:flex; justify-content:center; gap:14px; margin-bottom:30px; flex-wrap:wrap; }
        .pm-pet-chip {
          background:#f1f8e9; border:2px solid #c5e1a5; border-radius:99px;
          padding:8px 16px; font-size:0.85rem; font-weight:700; color:#33691e;
          display:flex; align-items:center; gap:6px;
        }
        .pm-start-btn {
          background: linear-gradient(135deg,#2e7d32,#1b5e20); color:white;
          border:none; padding:16px 40px; border-radius:99px;
          font-size:1rem; font-weight:800; cursor:pointer; font-family:'Nunito',sans-serif;
          box-shadow:0 6px 20px rgba(46,125,50,0.35); transition:all 0.25s;
          letter-spacing:0.3px;
        }
        .pm-start-btn:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(46,125,50,0.4); }

        /* ── Question ── */
        .pm-question { animation: fadeSlide 0.35s ease; }
        .pm-q-emoji { font-size:2.8rem; margin-bottom:12px; display:block; }
        .pm-q-counter { font-size:0.72rem; font-weight:800; color:#81c784; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px; }
        .pm-q-text {
          font-family:'Playfair Display',serif; font-size:1.35rem; font-weight:700;
          color:#1a2e1a; line-height:1.3; margin-bottom:26px;
        }
        .pm-options { display:flex; flex-direction:column; gap:12px; }
        .pm-opt-btn {
          padding:15px 20px; border-radius:16px; border:2px solid #e8f5e8;
          background:#fafcfa; font-size:0.92rem; font-weight:700; color:#2d4a2d;
          text-align:left; cursor:pointer; transition:all 0.2s;
          font-family:'Nunito',sans-serif; display:flex; align-items:center; gap:10px;
          position:relative; overflow:hidden;
        }
        .pm-opt-btn::before {
          content:''; position:absolute; left:0; top:0; bottom:0; width:4px;
          background:#2e7d32; transform:scaleY(0); transition:transform 0.2s; border-radius:0 4px 4px 0;
        }
        .pm-opt-btn:hover { border-color:#81c784; background:#f1f8f1; transform:translateX(4px); }
        .pm-opt-btn:hover::before { transform:scaleY(1); }
        .pm-opt-btn.selected { border-color:#2e7d32; background:#e8f5e9; color:#1b5e20; transform:translateX(4px); }
        .pm-opt-btn.selected::before { transform:scaleY(1); }
        .pm-opt-btn:disabled { cursor:not-allowed; opacity:0.7; }

        /* ── Result ── */
        .pm-result { text-align:center; animation: floatUp 0.5s ease; }
        .pm-result-emoji-wrap {
          width:110px; height:110px; border-radius:50%; margin:0 auto 16px;
          display:flex; align-items:center; justify-content:center; font-size:4rem;
          animation: popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
        }
        .pm-match-label {
          font-size:0.75rem; font-weight:800; letter-spacing:0.15em;
          text-transform:uppercase; margin-bottom:6px;
        }
        .pm-result-name {
          font-family:'Playfair Display',serif; font-size:2.4rem; font-weight:900;
          color:#1a2e1a; line-height:1; margin-bottom:4px;
        }
        .pm-result-tagline { font-size:0.9rem; color:#888; font-weight:600; margin-bottom:16px; }
        .pm-result-desc { font-size:0.9rem; color:#555; line-height:1.65; margin-bottom:24px; text-align:left; }

        .pm-traits { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:24px; }
        .pm-trait {
          padding:7px 16px; border-radius:99px; font-size:0.78rem; font-weight:800;
          letter-spacing:0.02em;
        }

        .pm-care { text-align:left; border-radius:16px; padding:16px 20px; margin-bottom:28px; }
        .pm-care-title { font-size:0.72rem; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:10px; }
        .pm-care ul { list-style:none; display:flex; flex-direction:column; gap:7px; }
        .pm-care li { font-size:0.85rem; font-weight:600; color:#444; display:flex; align-items:center; gap:8px; }
        .pm-care li::before { content:'✓'; font-weight:900; }

        .pm-result-btns { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; }
        .pm-primary-btn {
          flex:1; min-width:160px; padding:15px 24px; border-radius:99px;
          border:none; color:white; font-size:0.9rem; font-weight:800;
          cursor:pointer; font-family:'Nunito',sans-serif; transition:all 0.25s;
          box-shadow:0 6px 18px rgba(0,0,0,0.15);
        }
        .pm-primary-btn:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(0,0,0,0.2); }
        .pm-ghost-btn {
          flex:1; min-width:140px; padding:15px 24px; border-radius:99px;
          border:2px solid #e0e0e0; background:white; color:#555;
          font-size:0.9rem; font-weight:800; cursor:pointer;
          font-family:'Nunito',sans-serif; transition:all 0.25s;
        }
        .pm-ghost-btn:hover { border-color:#bdbdbd; background:#f5f5f5; }

        /* ── Score bar (subtle) ── */
        .pm-score-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
        .pm-score-label { font-size:0.78rem; font-weight:700; width:60px; color:#555; }
        .pm-score-track { flex:1; height:6px; background:#eee; border-radius:99px; overflow:hidden; }
        .pm-score-bar { height:100%; border-radius:99px; transition:width 1s ease 0.3s; }

        @media (max-width:480px) {
          .pm-body { padding:28px 22px 32px; }
          .pm-header { padding:22px 24px 18px; }
          .pm-q-text { font-size:1.15rem; }
          .pm-result-name { font-size:1.9rem; }
        }
      `}</style>

      <div className="pm-card">
        {/* Header */}
        <div className="pm-header">
          <div className="pm-header-top">
            <span className="pm-logo">🐾</span>
            <div>
              <div className="pm-title">Pet Matchmaker</div>
              <div className="pm-subtitle">Find your perfect companion in Cebu</div>
            </div>
          </div>
          {step === 1 && (
            <div className="pm-progress-wrap">
              <div className="pm-progress-track">
                <div className="pm-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="pm-progress-label">
                Question {questionIndex + 1} of {total}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="pm-progress-wrap">
              <div className="pm-progress-track">
                <div className="pm-progress-fill" style={{ width: "100%" }} />
              </div>
              <div className="pm-progress-label">Complete! 🎉</div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="pm-body">

          {/* ── Intro ── */}
          {step === 0 && (
            <div className="pm-intro">
              <span className="pm-intro-emoji">🐾</span>
              <h2>Which pet is meant for you?</h2>
              <p>Answer {total} quick questions and we'll match you with your ideal furry (or finned!) companion based on your lifestyle.</p>
              <div className="pm-pets-preview">
                {Object.entries(RESULTS).map(([key, r]) => (
                  <div key={key} className="pm-pet-chip">{r.emoji} {r.name}</div>
                ))}
              </div>
              <button className="pm-start-btn" onClick={() => setStep(1)}>
                Find My Match →
              </button>
            </div>
          )}

          {/* ── Question ── */}
          {step === 1 && (
            <div className="pm-question" key={questionIndex}>
              <span className="pm-q-emoji">{QUESTIONS[questionIndex].emoji}</span>
              <div className="pm-q-counter">Question {questionIndex + 1} / {total}</div>
              <div className="pm-q-text">{QUESTIONS[questionIndex].text}</div>
              <div className="pm-options">
                {QUESTIONS[questionIndex].options.map((opt, i) => (
                  <button
                    key={i}
                    className={`pm-opt-btn${selectedOption === i ? " selected" : ""}`}
                    onClick={() => handleAnswer(opt.score, i)}
                    disabled={animating}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Result ── */}
          {step === 2 && res && (
            <div className="pm-result">
              <div
                className="pm-result-emoji-wrap"
                style={{ background: res.light, border: `3px solid ${res.color}20` }}
              >
                {res.emoji}
              </div>

              <div className="pm-match-label" style={{ color: res.color }}>
                🎉 It's a Match!
              </div>
              <div className="pm-result-name">{res.name}</div>
              <div className="pm-result-tagline">{res.tagline}</div>

              <p className="pm-result-desc">{res.description}</p>

              {/* Traits */}
              <div className="pm-traits">
                {res.traits.map((t, i) => (
                  <span
                    key={i}
                    className="pm-trait"
                    style={{ background: res.light, color: res.color }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Care tips */}
              <div className="pm-care" style={{ background: res.light }}>
                <div className="pm-care-title" style={{ color: res.color }}>🌿 Care Essentials</div>
                <ul>
                  {res.care.map((c, i) => (
                    <li key={i} style={{ "--check-color": res.color }}>
                      <span style={{ color: res.color }}>✓</span> {c}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Score breakdown */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize:"0.72rem", fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:"#aaa", marginBottom:"10px" }}>
                  Compatibility Scores
                </div>
                {Object.entries(scores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([pet, sc]) => {
                    const max = Math.max(...Object.values(scores));
                    const r = RESULTS[pet];
                    return (
                      <div key={pet} className="pm-score-row">
                        <span className="pm-score-label">{r.emoji} {r.name}</span>
                        <div className="pm-score-track">
                          <div
                            className="pm-score-bar"
                            style={{
                              width: `${(sc / max) * 100}%`,
                              background: r.color,
                              opacity: pet === result ? 1 : 0.35,
                            }}
                          />
                        </div>
                        <span style={{ fontSize:"0.72rem", fontWeight:800, color:"#aaa", width:"28px", textAlign:"right" }}>{sc}</span>
                      </div>
                    );
                  })}
              </div>

              <div className="pm-result-btns">
                <button
                  className="pm-primary-btn"
                  style={{ background: `linear-gradient(135deg,${res.color},${res.color}cc)` }}
                  onClick={() => navigate("/adopt")}
                >
                  View Available {res.name}s →
                </button>
                <button className="pm-ghost-btn" onClick={restart}>
                  Retake Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}