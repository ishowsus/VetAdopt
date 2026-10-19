import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (val) => {
  if (!val) return "—";
  // Firestore Timestamp
  if (val?.toDate) return val.toDate().toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  // ISO string / JS date
  const d = new Date(val);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const ROLE_STYLE = {
  admin:        { bg: "#e8f5e9", color: "#2e7d32", label: "Admin" },
  adopter:      { bg: "#e3f2fd", color: "#0277bd", label: "Adopter" },
  veterinarian: { bg: "#fff3e0", color: "#ef6c00", label: "Veterinarian" },
  shelter:      { bg: "#f3e5f5", color: "#7b1fa2", label: "Shelter" },
};

const STATUS_STYLE = {
  active:    { bg: "#e8f5e9", color: "#2e7d32", label: "Active" },
  suspended: { bg: "#fff8e1", color: "#f57f17", label: "Suspended" },
  banned:    { bg: "#ffebee", color: "#c62828", label: "Banned" },
};

const ROLE_OPTIONS = ["adopter", "veterinarian", "shelter", "admin"];
const ROLE_FILTERS = ["all", ...ROLE_OPTIONS];
const STATUS_FILTERS = ["all", "active", "suspended", "banned"];

// Older accounts may have "approved"/"pending" or no status — those are active.
const getStatus = (u) => (["suspended", "banned"].includes(u.status) ? u.status : "active");

// ─── Inline Toast ─────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: type === "error" ? "#c62828" : "#2e7d32",
      color: "white", padding: "13px 20px", borderRadius: "12px",
      fontSize: "0.87rem", fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      maxWidth: 340,
    }}>
      {msg}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ message, confirmLabel = "Confirm", danger = true, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000,
    }}>
      <div style={{
        background: "white", borderRadius: "20px", padding: "32px",
        maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        fontFamily: "'DM Sans',sans-serif",
      }}>
        <p style={{ fontSize: "0.95rem", color: "#333", marginBottom: "24px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: "10px", border: "2px solid #eee", background: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: danger ? "#d32f2f" : "#2e7d32", color: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Users() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast]     = useState(null);
  const [confirm, setConfirm] = useState(null); // { message, confirmLabel, danger, onConfirm }
  const [currentUid, setCurrentUid] = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });
  const ask = (message, onConfirm, opts = {}) => setConfirm({ message, onConfirm, ...opts });

  // Track who's actually logged in right now (via Firebase Auth, not
  // localStorage) so we can stop an admin from suspending/banning themself.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUid(u?.uid ?? null));
    return unsub;
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      showToast("Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Change a user's account status: "active" | "suspended" | "banned"
  const changeStatus = (user, newStatus) => {
    if (user.id === currentUid) {
      showToast("You can't change your own account status.", "error");
      return;
    }

    const name = user.name || "this user";
    const copy = {
      suspended: { q: `Suspend ${name}? They won't be able to sign in until you reactivate them.`, label: "Suspend", done: "suspended", danger: true },
      banned:    { q: `Ban ${name}? They won't be able to sign in.`, label: "Ban", done: "banned", danger: true },
      active:    { q: `Reactivate ${name}? They'll be able to sign in again.`, label: "Reactivate", done: "reactivated", danger: false },
    }[newStatus];

    ask(copy.q, async () => {
      setConfirm(null);
      try {
        await updateDoc(doc(db, "users", user.id), {
          status: newStatus,
          statusUpdatedAt: serverTimestamp(),
          statusUpdatedBy: currentUid,
        });
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
        showToast(`${user.name || "User"} has been ${copy.done}.`);
      } catch (err) {
        console.error(err);
        showToast("Failed to update account status.", "error");
      }
    }, { confirmLabel: copy.label, danger: copy.danger });
  };

  const roleFiltered = roleFilter === "all" ? users : users.filter((u) => (u.role || "adopter") === roleFilter);
  const statusFiltered = statusFilter === "all" ? roleFiltered : roleFiltered.filter((u) => getStatus(u) === statusFilter);
  const filtered = statusFiltered.filter((u) => {
    const q = search.toLowerCase();
    return (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  return (
    <div className="um-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=DM+Sans:wght@400;500;600;700&display=swap');

        .um-root {
          --ink: #10261c;
          --green: #1f6b3a;
          --green-dark: #17532d;
          --amber: #a8650d;
          --red: #b3261e;
          --mist: #eef4f0;
          --line: #d3ded6;
          --muted: #58695e;
          padding: 32px 36px;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: var(--ink);
          max-width: 1100px;
        }
        .um-header { margin-bottom: 22px; }
        .um-title {
          font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }
        .um-sub { font-size: 0.95rem; color: var(--muted); max-width: 60ch; line-height: 1.5; }

        /* One bar of counts that also filters the table */
        .um-status {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          margin-bottom: 20px;
        }
        .um-status-btn {
          text-align: left;
          padding: 16px 20px 14px;
          background: #fff;
          border: none;
          border-right: 1px solid var(--line);
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font: inherit;
          transition: background 0.15s;
        }
        .um-status-btn:last-child { border-right: none; }
        .um-status-btn:hover { background: var(--mist); }
        .um-status-btn:focus-visible { outline: 3px solid var(--green); outline-offset: -3px; }
        .um-status-count {
          display: block;
          font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif;
          font-size: 1.9rem;
          font-weight: 700;
          line-height: 1.1;
        }
        .um-status-label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--muted); margin-top: 2px; }
        .um-status-btn.active { background: var(--mist); border-bottom-color: var(--ink); }
        .um-status-active.active { border-bottom-color: var(--green); }
        .um-status-active .um-status-count { color: var(--green); }
        .um-status-suspended.active { border-bottom-color: var(--amber); }
        .um-status-suspended .um-status-count { color: var(--amber); }
        .um-status-banned.active { border-bottom-color: var(--red); }
        .um-status-banned .um-status-count { color: var(--red); }

        .um-filter-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
        .um-filter-btn {
          padding: 7px 14px;
          border-radius: 99px;
          border: 1.5px solid var(--line);
          background: #fff;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          color: var(--muted);
          transition: all 0.15s;
        }
        .um-filter-btn:hover { border-color: var(--green); color: var(--green-dark); }
        .um-filter-btn.active { background: var(--ink); color: #fff; border-color: var(--ink); }
        .um-filter-btn:focus-visible { outline: 3px solid var(--green); outline-offset: 2px; }

        .um-toolbar { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; flex-wrap: wrap; }
        .um-search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 380px; }
        .um-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 0.9rem; }
        .um-search {
          width: 100%;
          padding: 11px 14px 11px 38px;
          border: 1.5px solid var(--line);
          border-radius: 12px;
          font: inherit;
          font-size: 0.92rem;
          background: #fff;
          color: var(--ink);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .um-search:focus { border-color: var(--green); box-shadow: 0 0 0 4px rgba(31, 107, 58, 0.14); }
        .um-count { font-size: 0.85rem; font-weight: 600; color: var(--muted); margin-left: auto; }

        .um-table-wrap { border: 1px solid var(--line); border-radius: 14px; overflow-x: auto; background: #fff; }
        table { width: 100%; border-collapse: collapse; min-width: 720px; }
        thead tr { background: var(--mist); }
        th {
          padding: 12px 16px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--muted);
          text-align: left;
          border-bottom: 1px solid var(--line);
          white-space: nowrap;
        }
        td { padding: 14px 16px; font-size: 0.92rem; border-bottom: 1px solid #e6eee8; vertical-align: middle; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: #f6faf7; }

        .um-name-cell { display: flex; align-items: center; gap: 12px; }
        .um-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.95rem;
          flex-shrink: 0;
        }
        .um-name { font-weight: 700; }
        .um-you-tag { font-size: 0.75rem; font-weight: 600; color: var(--muted); margin-left: 6px; }
        .um-email { color: var(--muted); }

        .um-role, .um-state { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; white-space: nowrap; }
        .um-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        .um-actions { display: flex; gap: 8px; align-items: center; }
        .um-btn {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1.5px solid currentColor;
          background: transparent;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .um-btn:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
        .um-btn:disabled { color: #a3b0a7; cursor: not-allowed; }
        .um-btn-suspend { color: var(--amber); }
        .um-btn-suspend:hover:not(:disabled) { background: var(--amber); color: #fff; }
        .um-btn-ban { color: var(--red); }
        .um-btn-ban:hover:not(:disabled) { background: var(--red); color: #fff; }
        .um-btn-restore { color: var(--green); }
        .um-btn-restore:hover:not(:disabled) { background: var(--green); color: #fff; }

        .um-empty { text-align: center; padding: 56px 20px; color: var(--muted); }
        .um-empty-icon { font-size: 2.2rem; margin-bottom: 10px; }
        .um-loading { padding: 40px; text-align: center; color: var(--muted); font-size: 0.95rem; }

        @media (max-width: 700px) {
          .um-root { padding: 20px; }
          .um-status { grid-template-columns: repeat(2, 1fr); }
          .um-status-btn:nth-child(2) { border-right: none; }
          .um-status-btn:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div className="um-header">
        <div className="um-title">User Management</div>
        <div className="um-sub">View and search users, and suspend, ban or reactivate accounts.</div>
      </div>

      <div className="um-status" role="group" aria-label="Filter by account status">
        {STATUS_FILTERS.map((f) => {
          const count = f === "all" ? users.length : users.filter((u) => getStatus(u) === f).length;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={statusFilter === f}
              className={`um-status-btn um-status-${f}${statusFilter === f ? " active" : ""}`}
              onClick={() => setStatusFilter(f)}
            >
              <span className="um-status-count">{count}</span>
              <span className="um-status-label">{f === "all" ? "All accounts" : STATUS_STYLE[f].label}</span>
            </button>
          );
        })}
      </div>

      <div className="um-filter-row">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f}
            className={`um-filter-btn ${roleFilter === f ? "active" : ""}`}
            onClick={() => setRoleFilter(f)}
          >
            {f === "all"
              ? `All (${users.length})`
              : `${ROLE_STYLE[f]?.label} (${users.filter(u => (u.role || "adopter") === f).length})`}
          </button>
        ))}
      </div>

      <div className="um-toolbar">
        <div className="um-search-wrap">
          <span className="um-search-icon">🔍</span>
          <input
            className="um-search"
            aria-label="Search users by name or email"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="um-count">{filtered.length} of {users.length} users</span>
      </div>

      <div className="um-table-wrap">
        {loading ? (
          <div className="um-loading">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="um-empty">
            <div className="um-empty-icon">👥</div>
            <p>{search ? `No users match "${search}"` : "No users found."}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const role = user.role || "adopter";
                const rs = ROLE_STYLE[role] || { bg: "#f5f5f5", color: "#666", label: role };
                const status = getStatus(user);
                const ss = STATUS_STYLE[status];
                const isSelf = user.id === currentUid;
                const selfTitle = isSelf ? "You can't change your own account status." : undefined;
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="um-name-cell">
                        <div className="um-avatar" style={{ background: rs.color }}>{(user.name || "?").charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="um-name">
                            {user.name || "—"}
                            {isSelf && <span className="um-you-tag">(you)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="um-email">{user.email || "—"}</td>
                    <td>
                      <span className="um-role"><span className="um-dot" style={{ background: rs.color }} />{rs.label}</span>
                    </td>
                    <td>
                      <span className="um-state" style={{ color: ss.color }}><span className="um-dot" style={{ background: ss.color }} />{ss.label}</span>
                    </td>
                    <td style={{ color: "#888", fontSize: "0.82rem" }}>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="um-actions">
                        {status === "active" && (
                          <button
                            className="um-btn um-btn-suspend"
                            disabled={isSelf}
                            title={selfTitle}
                            onClick={() => changeStatus(user, "suspended")}
                          >
                            Suspend
                          </button>
                        )}
                        {status !== "banned" && (
                          <button
                            className="um-btn um-btn-ban"
                            disabled={isSelf}
                            title={selfTitle}
                            onClick={() => changeStatus(user, "banned")}
                          >
                            Ban
                          </button>
                        )}
                        {status !== "active" && (
                          <button
                            className="um-btn um-btn-restore"
                            disabled={isSelf}
                            title={selfTitle}
                            onClick={() => changeStatus(user, "active")}
                          >
                            {status === "banned" ? "Unban" : "Reactivate"}
                          </button>
                        )}
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
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}