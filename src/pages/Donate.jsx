import { useState } from "react";

const SUGGESTED = [100, 250, 500, 1000, 2500];

const WALLETS = [
  { id: "gcash", name: "GCash", icon: "💙", badge: "Most Popular" },
  { id: "paymaya", name: "Maya", icon: "💚", badge: "Instant" },
  { id: "grabpay", name: "GrabPay", icon: "🟢", badge: "Rewards" },
  { id: "qrph", name: "QR Ph", icon: "🔳", badge: "Universal QR" },
];

const IMPACT = [
  { emoji: "🍖", amount: 100, label: "feeds a rescue pet for a week" },
  { emoji: "💉", amount: 500, label: "covers a full vaccination course" },
  { emoji: "🏥", amount: 1000, label: "funds a vet checkup & meds" },
  { emoji: "🏠", amount: 2500, label: "sponsors shelter for one month" },
];

export default function DonateEWallet() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    amount: "",
    wallet: "gcash",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | processing | error
  const [errorMsg, setErrorMsg] = useState("");

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const pickAmt = (amt) => setForm({ ...form, amount: String(amt) });
  const pickWallet = (walletId) => setForm({ ...form, wallet: walletId });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = "Valid email is required.";
    if (!form.amount || isNaN(form.amount) || Number(form.amount) < 10)
      e.amount = "Minimum donation is ₱10.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("processing");
    setErrorMsg("");

    try {
      // Send selected wallet type and donation details to backend
      const res = await fetch("http://localhost:5000/create-ewallet-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.amount),
          paymentMethod: form.wallet,
          name: form.name,
          email: form.email,
          message: form.message,
        }),
      });

      if (!res.ok) throw new Error("Server error. Please try again.");
      const { redirectUrl } = await res.json();

      // Redirect user to GCash / Maya login or QR page
      window.location.href = redirectUrl;
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong.");
      setStatus("error");
    }
  };

  const activeImpact = IMPACT.find((i) => Number(form.amount) >= i.amount);

  return (
    <div className="dn-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
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

        .dn-card { width:100%; max-width:640px; position:relative; z-index:1; animation: fadeUp 0.6s ease both; }

        /* Hero */
        .dn-hero { text-align: center; margin-bottom: 32px; }
        .dn-hero-icon { font-size: 3.5rem; display:block; margin-bottom:12px; animation: heartbeat 2s ease-in-out infinite; }
        .dn-hero h1 { font-family: 'Instrument Serif', serif; font-size: clamp(2rem,5vw,3rem); font-weight: 400; color: white; line-height: 1.15; margin-bottom: 10px; }
        .dn-hero h1 em { font-style: italic; color: #a5d6a7; }
        .dn-hero p { color: rgba(255,255,255,0.55); font-size: 0.92rem; line-height: 1.6; max-width: 440px; margin: 0 auto; }

        /* Form Card */
        .dn-form-card { background: white; border-radius: 28px; padding: 40px; box-shadow: 0 40px 80px rgba(0,0,0,0.35); }

        /* Amount Chips */
        .dn-amounts { display:flex; flex-wrap:wrap; gap:8px; margin: 8px 0 12px; }
        .dn-amt-chip {
          padding: 10px 18px; border-radius: 99px; border: 2px solid #e0ece0;
          background: white; color: #2e7d32; font-weight: 800; font-size: 0.88rem;
          cursor: pointer; transition: all 0.18s;
        }
        .dn-amt-chip:hover { border-color: #81c784; background: #f1f8f1; }
        .dn-amt-chip.active { background: #2e7d32; color: white; border-color: #2e7d32; box-shadow: 0 4px 12px rgba(46,125,50,0.3); }

        /* Impact preview */
        .dn-impact-preview {
          display: flex; align-items: center; gap: 10px;
          background: #f1f8f1; border-radius: 12px; padding: 12px 16px;
          margin-bottom: 16px; font-size: 0.85rem; color: #2e5c2e; animation: impactIn 0.3s ease;
        }
        .dn-impact-icon { font-size: 1.4rem; flex-shrink: 0; }

        /* E-Wallet Selection Grid */
        .dn-wallets { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 8px 0 18px; }
        .dn-wallet-card {
          border: 2px solid #e0ece0; border-radius: 14px; padding: 12px;
          display: flex; align-items: center; justify-content: space-between;
          cursor: pointer; transition: all 0.2s; background: white;
        }
        .dn-wallet-card:hover { border-color: #81c784; background: #fcfdfc; }
        .dn-wallet-card.active { border-color: #2e7d32; background: #f1f8f1; box-shadow: 0 4px 12px rgba(46,125,50,0.15); }
        .dn-wallet-info { display: flex; align-items: center; gap: 10px; }
        .dn-wallet-icon { font-size: 1.3rem; }
        .dn-wallet-name { font-weight: 800; font-size: 0.9rem; color: #1a2e1a; }
        .dn-wallet-badge { font-size: 0.65rem; font-weight: 700; color: #2e7d32; background: #e8f5e9; padding: 3px 7px; border-radius: 6px; }

        /* Fields */
        .dn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .dn-field { margin-bottom: 16px; }
        .dn-label { display: block; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #2e7d32; margin-bottom: 6px; }
        .dn-input {
          width: 100%; padding: 13px 16px; border: 2px solid #e0ece0; border-radius: 12px;
          font-size: 0.92rem; font-family: 'Cabinet Grotesk', sans-serif; color: #1a2e1a;
          outline: none; transition: border-color 0.2s; background: white;
        }
        .dn-input:focus { border-color: #2e7d32; }
        .dn-input.err { border-color: #e53935; }
        .dn-input-wrap { position: relative; }
        .dn-prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #2e7d32; font-weight: 800; font-size: 1rem; pointer-events: none; }
        .dn-input-pfx { padding-left: 30px; }
        .dn-textarea { resize: vertical; min-height: 80px; }
        .dn-err { font-size: 0.75rem; color: #c62828; margin-top: 5px; font-weight: 600; }
        .dn-divider { border: none; border-top: 1px solid #eef4ee; margin: 20px 0; }
        .dn-secure { font-size: 0.72rem; color: #9aaa9a; margin-top: 8px; font-weight: 600; text-align: center; }

        /* Button */
        .dn-btn {
          width: 100%; padding: 17px; border-radius: 14px; border: none;
          background: linear-gradient(135deg,#2e7d32,#1b5e20); color: white;
          font-size: 1rem; font-weight: 900; cursor: pointer; letter-spacing: 0.3px;
          transition: all 0.25s; box-shadow: 0 6px 20px rgba(46,125,50,0.35);
        }
        .dn-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(46,125,50,0.4); }
        .dn-btn:disabled { background: #c8d8c8; box-shadow: none; cursor: not-allowed; }

        @media (max-width: 560px) {
          .dn-wallets { grid-template-columns: 1fr; }
          .dn-row { grid-template-columns: 1fr; }
          .dn-form-card { padding: 28px 22px; }
        }
      `}</style>

      <div className="dn-card">
        <div className="dn-hero">
          <span className="dn-hero-icon">🐾</span>
          <h1>
            Give a pet a<br />
            <em>second chance</em>
          </h1>
          <p>
            Donate instantly using GCash, Maya, or QR Ph to support rescued
            pets in Cebu.
          </p>
        </div>

        <div className="dn-form-card">
          <form onSubmit={handleSubmit} noValidate>
            {/* Amount Selection */}
            <div className="dn-label">1. Choose Amount</div>
            <div className="dn-amounts">
              {SUGGESTED.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`dn-amt-chip ${
                    String(form.amount) === String(amt) ? "active" : ""
                  }`}
                  onClick={() => pickAmt(amt)}
                >
                  ₱{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Impact indicator */}
            {activeImpact && (
              <div className="dn-impact-preview">
                <span className="dn-impact-icon">{activeImpact.emoji}</span>
                <span>
                  Your ₱{Number(form.amount).toLocaleString()}{" "}
                  <strong>{activeImpact.label}</strong>
                </span>
              </div>
            )}

            {/* Custom Amount Input */}
            <div className="dn-field">
              <div className="dn-input-wrap">
                <span className="dn-prefix">₱</span>
                <input
                  className={`dn-input dn-input-pfx${
                    errors.amount ? " err" : ""
                  }`}
                  type="number"
                  placeholder="Or enter custom amount (e.g. 750)"
                  value={form.amount}
                  onChange={set("amount")}
                  min="10"
                />
              </div>
              {errors.amount && <p className="dn-err">{errors.amount}</p>}
            </div>

            <div className="dn-divider" />

            {/* E-Wallet Selection */}
            <div className="dn-label">2. Select E-Wallet / Payment Method</div>
            <div className="dn-wallets">
              {WALLETS.map((w) => (
                <div
                  key={w.id}
                  className={`dn-wallet-card ${
                    form.wallet === w.id ? "active" : ""
                  }`}
                  onClick={() => pickWallet(w.id)}
                >
                  <div className="dn-wallet-info">
                    <span className="dn-wallet-icon">{w.icon}</span>
                    <span className="dn-wallet-name">{w.name}</span>
                  </div>
                  <span className="dn-wallet-badge">{w.badge}</span>
                </div>
              ))}
            </div>

            <div className="dn-divider" />

            {/* Donor Information */}
            <div className="dn-label">3. Donor Details</div>
            <div className="dn-row">
              <div className="dn-field">
                <input
                  className={`dn-input${errors.name ? " err" : ""}`}
                  type="text"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={set("name")}
                />
                {errors.name && <p className="dn-err">{errors.name}</p>}
              </div>
              <div className="dn-field">
                <input
                  className={`dn-input${errors.email ? " err" : ""}`}
                  type="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={set("email")}
                />
                {errors.email && <p className="dn-err">{errors.email}</p>}
              </div>
            </div>

            <div className="dn-field">
              <textarea
                className="dn-input dn-textarea"
                placeholder="Leave a message for the shelter (optional) 🐾"
                value={form.message}
                onChange={set("message")}
                rows={2}
              />
            </div>

            {status === "error" && (
              <div className="dn-error-box">⚠️ {errorMsg}</div>
            )}

            <button
              type="submit"
              className="dn-btn"
              disabled={status === "processing"}
            >
              {status === "processing"
                ? "Redirecting to E-Wallet…"
                : `Pay ${
                    form.amount
                      ? `₱${Number(form.amount).toLocaleString()}`
                      : ""
                  } with ${
                    WALLETS.find((w) => w.id === form.wallet)?.name
                  } →`}
            </button>

            <p className="dn-secure">
              📲 You will be redirected to complete your payment securely.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}