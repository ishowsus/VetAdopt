import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";

const CARDS = [
  { key: "users",        label: "Registered Users",    icon: "👥", color: "#2e7d32", light: "#e8f5e9" },
  { key: "applications", label: "Adoption Requests",   icon: "🐾", color: "#f57f17", light: "#fff8e1" },
  { key: "appointments", label: "Vet Appointments",    icon: "🩺", color: "#0288d1", light: "#e1f5fe" },
  { key: "reports",      label: "Pending Reports",     icon: "📋", color: "#d32f2f", light: "#ffebee" },
];

const QUICK_LINKS = [
  { label: "Manage Users",   path: "/admin/users",    color: "#2e7d32" },
  { label: "View Reports",   path: "/admin/reports",  color: "#d32f2f" },
  { label: "Settings",       path: "/admin/settings", color: "#0288d1" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, applications: 0, appointments: 0, reports: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersSnap, appsSnap, apptSnap, reportsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "applications")),
          getDocs(collection(db, "appointments")),
          getDocs(collection(db, "reports")),
        ]);
        setStats({
          users:        usersSnap.size,
          applications: appsSnap.size,
          appointments: apptSnap.size,
          reports:      reportsSnap.size,
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load stats. Check Firestore rules.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="ad-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .ad-root { padding:32px 36px; font-family:'DM Sans',sans-serif; color:#1a1a1a; max-width:1100px; }
        .ad-title { font-size:1.6rem; font-weight:800; color:#1a2e1a; margin-bottom:4px; }
        .ad-sub { font-size:0.88rem; color:#9aaa9a; margin-bottom:32px; }
        .ad-stat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:18px; margin-bottom:36px; }
        .ad-stat-card {
          padding:24px; border-radius:18px; border:1px solid #eee;
          display:flex; align-items:center; gap:16px; background:white;
          box-shadow:0 2px 10px rgba(0,0,0,0.04); transition:transform 0.2s,box-shadow 0.2s;
        }
        .ad-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.08); }
        .ad-stat-icon { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; flex-shrink:0; }
        .ad-stat-num { font-size:1.8rem; font-weight:800; line-height:1; }
        .ad-stat-label { font-size:0.75rem; font-weight:600; color:#9aaa9a; margin-top:3px; text-transform:uppercase; letter-spacing:0.05em; }
        .ad-section-title { font-size:1rem; font-weight:800; color:#1a2e1a; margin-bottom:14px; }
        .ad-links { display:flex; gap:12px; flex-wrap:wrap; }
        .ad-link-btn {
          padding:12px 22px; border-radius:12px; border:none; color:white;
          font-size:0.88rem; font-weight:700; cursor:pointer;
          font-family:'DM Sans',sans-serif; transition:all 0.2s;
          box-shadow:0 4px 12px rgba(0,0,0,0.12);
        }
        .ad-link-btn:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,0.18); }
        .ad-skeleton { background:#f0f0f0; border-radius:8px; animation:shimmer 1.2s infinite; }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .ad-error { background:#ffebee; color:#c62828; padding:14px 18px; border-radius:12px; font-size:0.88rem; font-weight:600; margin-bottom:24px; }
        @media(max-width:600px) { .ad-root { padding:20px; } }
      `}</style>

      <div className="ad-title">Admin Dashboard</div>
      <div className="ad-sub">Overview of the system and quick stats.</div>

      {error && <div className="ad-error">⚠️ {error}</div>}

      <div className="ad-stat-grid">
        {CARDS.map((c) => (
          <div key={c.key} className="ad-stat-card">
            <div className="ad-stat-icon" style={{ background: c.light }}>
              {c.icon}
            </div>
            <div>
              {loading
                ? <div className="ad-skeleton" style={{ width: 48, height: 28, marginBottom: 6 }} />
                : <div className="ad-stat-num" style={{ color: c.color }}>{stats[c.key]}</div>
              }
              <div className="ad-stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ad-section-title">Quick Links</div>
      <div className="ad-links">
        {QUICK_LINKS.map((l) => (
          <button
            key={l.label}
            className="ad-link-btn"
            style={{ background: l.color }}
            onClick={() => navigate(l.path)}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}