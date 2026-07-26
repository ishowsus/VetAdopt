import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe("YOUR_STRIPE_PUBLISHABLE_KEY");

const SUGGESTED = [100, 250, 500, 1000, 2500];

const IMPACT = [
  { emoji: "🍖", amount: 100, label: "feeds a rescue pet for a week" },
  { emoji: "💉", amount: 500, label: "covers a full vaccination course" },
  { emoji: "🏥", amount: 1000, label: "funds a vet checkup & meds" },
  { emoji: "🏠", amount: 2500, label: "sponsors shelter for one month" },
];

const CARD_STYLE = {
  style: {
    base: {
      fontSize: "15px",
      fontFamily: "'DM Sans', sans-serif",
      color: "#1a2e1a",
      "::placeholder": { color: "#a0b4a0" },
    },
    invalid: { color: "#c62828" },
  },
};

// ─── Form ──────────────────────────────────────────────────────────────────────
function DonateForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [form, setForm] = useState({ name: "", email: "", amount: "", message: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | processing | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const pick = (amt) => setForm({ ...form, amount: String(amt) });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email is required.";
    if (!form.amount || isNaN(form.amount) || Number(form.amount) < 10) e.amount = "Minimum donation is ₱10.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("processing");
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:5000/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(form.amount) }),
      });

      if (!res.ok) throw new Error("Server error. Please try again.");
      const { clientSecret } = await res.json();

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: form.name, email: form.email },
        },
      });

      if (result.error) {
        setErrorMsg(result.error.message);
        setStatus("error");
      } else if (result.paymentIntent.status === "succeeded") {
        setStatus("success");
        setForm({ name: "", email: "", amount: "", message: "" });
      }
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong.");
      setStatus("error");
    }
  };

  const activeImpact = IMPACT.find((i) => Number(form.amount) >= i.amount);

  if (status === "success") {
    return (
      <div className="dn-success">
        <span className="dn-success-icon">🎉</span>
        <h2 className="dn-success-title">Thank you so much!</h2>
        <p className="dn-success-msg">
          Your donation of <strong>₱{form.amount || "your gift"}</strong> is already making a difference for rescued pets in Cebu. We'll send a receipt to your email shortly.
        </p>
        <button className="dn-btn" onClick={() => setStatus("idle")}>Make Another Donation</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* Suggested amounts */}
      <div className="dn-label">Choose an amount</div>
      <div className="dn-amounts">
        {SUGGESTED.map((amt) => (
          <button
            key={amt}
            type="button"
            className={`dn-amt-chip ${String(form.amount) === String(amt) ? "active" : ""}`}
            onClick={() => pick(amt)}
          >
            ₱{amt.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Impact preview */}
      {activeImpact && (
        <div className="dn-impact-preview">
          <span className="dn-impact-icon">{activeImpact.emoji}</span>
          <span>Your ₱{Number(form.amount).toLocaleString()} <strong>{activeImpact.label}</strong></span>
        </div>
      )}

      {/* Custom amount */}
      <div className="dn-field">
        <label className="dn-label">Or enter custom amount (₱)</label>
        <div className="dn-input-wrap">
          <span className="dn-prefix">₱</span>
          <input
            className={`dn-input dn-input-pfx${errors.amount ? " err" : ""}`}
            type="number"
            placeholder="e.g. 750"
            value={form.amount}
            onChange={set("amount")}
            min="10"
          />
        </div>
        {errors.amount && <p className="dn-err">{errors.amount}</p>}
      </div>

      <div className="dn-divider" />

      {/* Personal info */}
      <div className="dn-row">
        <div className="dn-field">
          <label className="dn-label">Full Name</label>
          <input className={`dn-input${errors.name ? " err" : ""}`} type="text" placeholder="Juan dela Cruz" value={form.name} onChange={set("name")} />
          {errors.name && <p className="dn-err">{errors.name}</p>}
        </div>
        <div className="dn-field">
          <label className="dn-label">Email</label>
          <input className={`dn-input${errors.email ? " err" : ""}`} type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} />
          {errors.email && <p className="dn-err">{errors.email}</p>}
        </div>
      </div>

      <div className="dn-field">
        <label className="dn-label">Leave a message (optional)</label>
        <textarea className="dn-input dn-textarea" placeholder="A kind word for the animals 🐾" value={form.message} onChange={set("message")} rows={3} />
      </div>

      <div className="dn-divider" />

      {/* Card */}
      <div className="dn-field">
        <label className="dn-label">Card Details</label>
        <div className="dn-card-wrap">
          <CardElement options={CARD_STYLE} />
        </div>
        <p className="dn-secure">🔒 Secured by Stripe · Your payment info is never stored</p>
      </div>

      {status === "error" && (
        <div className="dn-error-box">⚠️ {errorMsg}</div>
      )}

      <button
        type="submit"
        className="dn-btn"
        disabled={!stripe || status === "processing"}
      >
        {status === "processing" ? (
          <span className="dn-spinner">⏳ Processing…</span>
        ) : (
          `Donate ${form.amount ? `₱${Number(form.amount).toLocaleString()}` : "Now"} →`
        )}
      </button>
    </form>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Donate() {
  return (
    <div className="dn-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes popIn { from { opacity:0; transform:scale(0.9) } to { opacity:1; transform:scale(1) } }
        @keyframes heartbeat { 0%,100%{transform:scale(1)} 30%{transform:scale(1.18)} 60%{transform:scale(1.06)} }
        @keyframes impactIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .dn-root {
          min-height: 100vh;
          background: linear-gradient(160deg, #0a1f0c 0%, #1b3a1e 40%, #0d2610 100%);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 60px 16px 80px; font-family: 'Cabinet Grotesk', sans-serif;
          position: relative; overflow: hidden;
        }

        /* Decorative blobs */
        .dn-root::before {
          content:''; position:fixed; width:500px; height:500px;
          border-radius:50%; background:radial-gradient(circle,rgba(46,125,50,0.18),transparent 70%);
          top:-100px; right:-100px; pointer-events:none;
        }
        .dn-root::after {
          content:''; position:fixed; width:400px; height:400px;
          border-radius:50%; background:radial-gradient(circle,rgba(104,159,56,0.12),transparent 70%);
          bottom:-80px; left:-80px; pointer-events:none;
        }

        .dn-card {
          width:100%; max-width:640px; position:relative; z-index:1;
          animation: fadeUp 0.6s ease both;
        }

        /* ── Hero block ── */
        .dn-hero {
          text-align: center; margin-bottom: 32px;
        }
        .dn-hero-icon {
          font-size: 3.5rem; display:block; margin-bottom:12px;
          animation: heartbeat 2s ease-in-out infinite;
        }
        .dn-hero h1 {
          font-family: 'Instrument Serif', serif; font-size: clamp(2rem,5vw,3rem);
          font-weight: 400; color: white; line-height: 1.15; margin-bottom: 10px;
        }
        .dn-hero h1 em { font-style: italic; color: #a5d6a7; }
        .dn-hero p { color: rgba(255,255,255,0.55); font-size: 0.92rem; line-height: 1.6; max-width: 440px; margin: 0 auto; }

        /* ── Impact stats ── */
        .dn-stats {
          display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 28px;
        }
        .dn-stat {
          background: rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
          border-radius: 16px; padding: 16px 10px; text-align:center;
          transition: background 0.2s;
        }
        .dn-stat:hover { background: rgba(255,255,255,0.1); }
        .dn-stat-emoji { font-size: 1.4rem; margin-bottom: 6px; display:block; }
        .dn-stat-amt { font-size: 1rem; font-weight: 900; color: #a5d6a7; }
        .dn-stat-label { font-size: 0.62rem; color: rgba(255,255,255,0.45); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; line-height: 1.3; }

        /* ── Form card ── */
        .dn-form-card {
          background: white; border-radius: 28px; padding: 40px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05);
        }

        /* ── Amount chips ── */
        .dn-amounts { display:flex; flex-wrap:wrap; gap:8px; margin: 8px 0 12px; }
        .dn-amt-chip {
          padding: 10px 18px; border-radius: 99px; border: 2px solid #e0ece0;
          background: white; color: #2e7d32; font-weight: 800; font-size: 0.88rem;
          cursor: pointer; transition: all 0.18s; font-family: 'Cabinet Grotesk', sans-serif;
        }
        .dn-amt-chip:hover { border-color: #81c784; background: #f1f8f1; }
        .dn-amt-chip.active { background: #2e7d32; color: white; border-color: #2e7d32; box-shadow: 0 4px 12px rgba(46,125,50,0.3); }

        /* ── Impact preview ── */
        .dn-impact-preview {
          display: flex; align-items: center; gap: 10px;
          background: #f1f8f1; border-radius: 12px; padding: 12px 16px;
          margin-bottom: 16px; font-size: 0.85rem; color: #2e5c2e;
          animation: impactIn 0.3s ease;
        }
        .dn-impact-icon { font-size: 1.4rem; flex-shrink: 0; }

        /* ── Fields ── */
        .dn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .dn-field { margin-bottom: 16px; }
        .dn-label {
          display: block; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: #2e7d32; margin-bottom: 6px;
        }
        .dn-input {
          width: 100%; padding: 13px 16px; border: 2px solid #e0ece0; border-radius: 12px;
          font-size: 0.92rem; font-family: 'Cabinet Grotesk', sans-serif; color: #1a2e1a;
          outline: none; transition: border-color 0.2s; background: white;
        }
        .dn-input:focus { border-color: #2e7d32; }
        .dn-input.err { border-color: #e53935; }
        .dn-input-wrap { position: relative; }
        .dn-prefix {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #2e7d32; font-weight: 800; font-size: 1rem; pointer-events: none;
        }
        .dn-input-pfx { padding-left: 30px; }
        .dn-textarea { resize: vertical; min-height: 80px; }
        .dn-err { font-size: 0.75rem; color: #c62828; margin-top: 5px; font-weight: 600; }

        /* ── Divider ── */
        .dn-divider { border: none; border-top: 1px solid #eef4ee; margin: 20px 0; }

        /* ── Card element ── */
        .dn-card-wrap {
          border: 2px solid #e0ece0; border-radius: 12px; padding: 14px 16px;
          transition: border-color 0.2s; background: white;
        }
        .dn-card-wrap:focus-within { border-color: #2e7d32; }
        .dn-secure { font-size: 0.72rem; color: #9aaa9a; margin-top: 8px; font-weight: 600; }

        /* ── Error box ── */
        .dn-error-box {
          background: #ffebee; color: #c62828; border-radius: 12px;
          padding: 12px 16px; font-size: 0.85rem; font-weight: 600; margin-bottom: 16px;
        }

        /* ── Submit button ── */
        .dn-btn {
          width: 100%; padding: 17px; border-radius: 14px; border: none;
          background: linear-gradient(135deg,#2e7d32,#1b5e20); color: white;
          font-size: 1rem; font-weight: 900; cursor: pointer; letter-spacing: 0.3px;
          font-family: 'Cabinet Grotesk', sans-serif; transition: all 0.25s;
          box-shadow: 0 6px 20px rgba(46,125,50,0.35);
        }
        .dn-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(46,125,50,0.4); }
        .dn-btn:disabled { background: #c8d8c8; box-shadow: none; cursor: not-allowed; }

        /* ── Success ── */
        .dn-success {
          text-align: center; padding: 20px 0; animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        .dn-success-icon { font-size: 5rem; display: block; margin-bottom: 16px; animation: heartbeat 1.5s ease-in-out 3; }
        .dn-success-title { font-family: 'Instrument Serif', serif; font-size: 2rem; color: #1a2e1a; margin-bottom: 10px; }
        .dn-success-msg { color: #666; font-size: 0.92rem; line-height: 1.65; margin-bottom: 28px; }

        /* ── Responsive ── */
        @media (max-width: 560px) {
          .dn-stats { grid-template-columns: repeat(2,1fr); }
          .dn-row { grid-template-columns: 1fr; }
          .dn-form-card { padding: 28px 22px; }
          .dn-amounts { gap: 6px; }
          .dn-amt-chip { padding: 9px 14px; font-size: 0.82rem; }
        }
      `}</style>

      <div className="dn-card">
        {/* Hero */}
        <div className="dn-hero">
          <span className="dn-hero-icon">🐾</span>
          <h1>Give a pet a<br /><em>second chance</em></h1>
          <p>Every peso you donate helps rescued animals in Cebu get the food, care, and love they deserve.</p>
        </div>

        {/* Impact stats */}
        <div className="dn-stats">
          {IMPACT.map((i) => (
            <div key={i.amount} className="dn-stat">
              <span className="dn-stat-emoji">{i.emoji}</span>
              <div className="dn-stat-amt">₱{i.amount.toLocaleString()}</div>
              <div className="dn-stat-label">{i.label}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="dn-form-card">
          <Elements stripe={stripePromise}>
            <DonateForm />
          </Elements>
        </div>
      </div>
    </div>
  );
}