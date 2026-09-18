import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../Firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (val) => {
  if (!val) return "—";
  if (val?.toDate) return val.toDate().toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  const d = new Date(val);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const STATUS_STYLE = {
  pending:  { bg: "#fff8e1", color: "#f57f17", label: "Pending" },
  resolved: { bg: "#e8f5e9", color: "#2e7d32", label: "Resolved" },
  rejected: { bg: "#ffebee", color: "#c62828", label: "Rejected" },
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: type === "error" ? "#c62828" : "#2e7d32",
      color: "white", padding: "13px 20px", borderRadius: "12px",
      fontSize: "0.87rem", fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    }}>
      {msg}
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000 }}>
      <div style={{ background: "white", borderRadius: "20px", padding: "32px", maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "'DM Sans',sans-serif" }}>
        <p style={{ fontSize: "0.95rem", color: "#333", marginBottom: "24px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: "10px", border: "2px solid #eee", background: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "#d32f2f", color: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const FILTERS = ["all", "pending", "resolved", "rejected"];

export default function Reports() {
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [toast, setToast]       = useState(null);
  const [confirm, setConfirm]   = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });
  const ask = (message, onConfirm) => setConfirm({ message, onConfirm });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "reports"));
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      showToast("Failed to load reports.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleResolve = async (report) => {
    try {
      await updateDoc(doc(db, "reports", report.id), { status: "resolved" });
      // Optimistic update — no need to refetch
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: "resolved" } : r));
      showToast("Report marked as resolved.");
    } catch (err) {
      console.error(err);
      showToast("Failed to resolve report.", "error");
    }
  };

  const handleReject = async (report) => {
    try {
      await updateDoc(doc(db, "reports", report.id), { status: "rejected" });
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: "rejected" } : r));
      showToast("Report marked as rejected.");
    } catch (err) {
      console.error(err);
      showToast("Failed to reject report.", "error");
    }
  };

  const handleDelete = (id) => {
    ask("Delete this report permanently?", async () => {
      setConfirm(null);
      try {
        await deleteDoc(doc(db, "reports", id));
        setReports((prev) => prev.filter((r) => r.id !== id));
        showToast("Report deleted.");
      } catch (err) {
        console.error(err);
        showToast("Failed to delete report.", "error");
      }
    });
  };

  const filtered = filter === "all" ? reports : reports.filter((r) => (r.status || "pending") === filter);

  return (
    <div className="rp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .rp-root { padding:32px 36px; font-family:'DM Sans',sans-serif; color:#1a1a1a; max-width:1100px; }
        .rp-title { font-size:1.6rem; font-weight:800; color:#1a2e1a; margin-bottom:4px; }
        .rp-sub { font-size:0.88rem; color:#9aaa9a; margin-bottom:24px; }
        .rp-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:22px; flex-wrap:wrap; }
        .rp-filter-btn {
          padding:8px 18px; border-radius:99px; border:2px solid #e8f0e8;
          background:white; font-size:0.78rem; font-weight:700; cursor:pointer;
          font-family:'DM Sans',sans-serif; text-transform:capitalize; transition:all 0.18s; color:#557055;
        }
        .rp-filter-btn:hover { border-color:#81c784; background:#f1f8f1; }
        .rp-filter-btn.active { background:#1a2e1a; color:white; border-color:#1a2e1a; }
        .rp-count { font-size:0.8rem; font-weight:700; color:#9aaa9a; margin-left:auto; }

        .rp-table-wrap { border-radius:18px; border:1px solid #eef4ee; overflow:hidden; background:white; box-shadow:0 4px 16px rgba(0,0,0,0.04); }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:#f8fcf8; }
        th { padding:14px 16px; font-size:0.72rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#9aaa9a; text-align:left; border-bottom:1px solid #eef4ee; white-space:nowrap; }
        td { padding:14px 16px; font-size:0.87rem; border-bottom:1px solid #f5f9f5; vertical-align:middle; color:#444; }
        tbody tr:last-child td { border-bottom:none; }
        tbody tr:hover { background:#fafcfa; }
        .rp-title-cell { font-weight:700; color:#1a2e1a; margin-bottom:2px; }
        .rp-desc { font-size:0.78rem; color:#9aaa9a; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .rp-badge { padding:4px 12px; border-radius:99px; font-size:0.7rem; font-weight:800; letter-spacing:0.05em; text-transform:uppercase; display:inline-block; }
        .rp-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .rp-btn { padding:7px 14px; border-radius:8px; border:none; font-size:0.78rem; font-weight:700; cursor:pointer; transition:all 0.18s; font-family:'DM Sans',sans-serif; white-space:nowrap; }
        .rp-btn-resolve { background:#e8f5e9; color:#2e7d32; }
        .rp-btn-resolve:hover { background:#2e7d32; color:white; }
        .rp-btn-reject { background:#fff8e1; color:#f57f17; }
        .rp-btn-reject:hover { background:#f57f17; color:white; }
        .rp-btn-del { background:#ffebee; color:#c62828; }
        .rp-btn-del:hover { background:#c62828; color:white; }
        .rp-empty { text-align:center; padding:60px 20px; color:#9aaa9a; }
        .rp-empty-icon { font-size:2.5rem; margin-bottom:10px; }
        .rp-loading { padding:40px; text-align:center; color:#9aaa9a; font-size:0.9rem; }
        @media(max-width:700px) { .rp-root { padding:20px; } .rp-table-wrap { overflow-x:auto; } .rp-desc { max-width:140px; } }
      `}</style>

      <div className="rp-title">Reports Management</div>
      <div className="rp-sub">View and manage reported issues, adoption feedback, or system reports.</div>

      <div className="rp-toolbar">
        {FILTERS.map((f) => (
          <button key={f} className={`rp-filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? `All (${reports.length})` : `${STATUS_STYLE[f]?.label} (${reports.filter(r => (r.status || "pending") === f).length})`}
          </button>
        ))}
        <span className="rp-count">{filtered.length} shown</span>
      </div>

      <div className="rp-table-wrap">
        {loading ? (
          <div className="rp-loading">Loading reports…</div>
        ) : filtered.length === 0 ? (
          <div className="rp-empty">
            <div className="rp-empty-icon">📋</div>
            <p>{filter === "all" ? "No reports found." : `No ${filter} reports.`}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Reported By</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const status = r.status || "pending";
                const ss = STATUS_STYLE[status] || STATUS_STYLE.pending;
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="rp-title-cell">{r.title || "Untitled"}</div>
                      <div className="rp-desc">{r.description || "—"}</div>
                    </td>
                    <td>{r.reportedBy || r.email || "—"}</td>
                    <td style={{ fontSize: "0.8rem", color: "#9aaa9a" }}>{formatDate(r.createdAt)}</td>
                    <td>
                      <span className="rp-badge" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
                    </td>
                    <td>
                      <div className="rp-actions">
                        {status === "pending" && (
                          <>
                            <button className="rp-btn rp-btn-resolve" onClick={() => handleResolve(r)}>Resolve</button>
                            <button className="rp-btn rp-btn-reject" onClick={() => handleReject(r)}>Reject</button>
                          </>
                        )}
                        <button className="rp-btn rp-btn-del" onClick={() => handleDelete(r.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}