import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../Firebase";

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

const ROLE_OPTIONS = ["adopter", "veterinarian", "shelter", "admin"];
const FILTERS = ["all", ...ROLE_OPTIONS];

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
function ConfirmDialog({ message, onConfirm, onCancel }) {
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
          <button onClick={onConfirm} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "#d32f2f", color: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Confirm</button>
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
  const [toast, setToast]     = useState(null);
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }
  const [currentUid, setCurrentUid] = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });
  const ask = (message, onConfirm) => setConfirm({ message, onConfirm });

  // Track who's actually logged in right now (via Firebase Auth, not
  // localStorage) so we can stop an admin from editing/deleting themself.
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

  const handleDelete = (id, name) => {
    if (id === currentUid) {
      showToast("You can't delete your own account from here.", "error");
      return;
    }
    ask(`Delete user "${name}"? This cannot be undone.`, async () => {
      setConfirm(null);
      try {
        // NOTE: this only removes the Firestore profile document. It does
        // NOT delete the person's actual Firebase Auth account — the
        // client SDK has no permission to delete other users. They would
        // still be able to log in afterward (Login.jsx would just treat
        // them as a role-less "user" since their profile doc is gone).
        // To fully remove a user (Auth + Firestore), you need a backend
        // Cloud Function using the Firebase Admin SDK's deleteUser(uid).
        await deleteDoc(doc(db, "users", id));
        setUsers((prev) => prev.filter((u) => u.id !== id));
        showToast(`"${name}"'s profile has been deleted. Their login will still work until the Auth account is also removed (requires a backend function).`);
      } catch (err) {
        console.error(err);
        showToast("Failed to delete user.", "error");
      }
    });
  };

  const handleRoleChange = (user, newRole) => {
    if (user.id === currentUid) {
      showToast("You can't change your own role from here.", "error");
      return;
    }
    if (newRole === user.role) return;

    ask(`Change ${user.name || "this user"}'s role to "${ROLE_STYLE[newRole]?.label || newRole}"?`, async () => {
      setConfirm(null);
      try {
        await updateDoc(doc(db, "users", user.id), { role: newRole });
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
        showToast(`${user.name || "User"} is now ${ROLE_STYLE[newRole]?.label || newRole}.`);
      } catch (err) {
        console.error(err);
        showToast("Failed to update role.", "error");
      }
    });
  };

  const roleFiltered = roleFilter === "all" ? users : users.filter((u) => (u.role || "adopter") === roleFilter);
  const filtered = roleFiltered.filter((u) => {
    const q = search.toLowerCase();
    return (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  return (
    <div className="um-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .um-root { padding:32px 36px; font-family:'DM Sans',sans-serif; color:#1a1a1a; max-width:1100px; }
        .um-header { margin-bottom:24px; }
        .um-title { font-size:1.6rem; font-weight:800; color:#1a2e1a; margin-bottom:4px; }
        .um-sub { font-size:0.88rem; color:#9aaa9a; }

        .um-filter-row { display:flex; align-items:center; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
        .um-filter-btn {
          padding:8px 16px; border-radius:99px; border:2px solid #e8f0e8;
          background:white; font-size:0.76rem; font-weight:700; cursor:pointer;
          font-family:'DM Sans',sans-serif; transition:all 0.18s; color:#557055;
        }
        .um-filter-btn:hover { border-color:#81c784; background:#f1f8f1; }
        .um-filter-btn.active { background:#1a2e1a; color:white; border-color:#1a2e1a; }

        .um-toolbar { display:flex; align-items:center; gap:14px; margin-bottom:22px; flex-wrap:wrap; }
        .um-search-wrap { position:relative; flex:1; min-width:200px; max-width:380px; }
        .um-search-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#9aaa9a; font-size:0.9rem; }
        .um-search {
          width:100%; padding:11px 14px 11px 38px; border:2px solid #e8f0e8;
          border-radius:12px; font-size:0.88rem; font-family:'DM Sans',sans-serif;
          outline:none; transition:border-color 0.2s;
        }
        .um-search:focus { border-color:#2e7d32; }
        .um-count { font-size:0.8rem; font-weight:700; color:#9aaa9a; margin-left:auto; }

        .um-table-wrap { border-radius:18px; border:1px solid #eef4ee; overflow:hidden; background:white; box-shadow:0 4px 16px rgba(0,0,0,0.04); }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:#f8fcf8; }
        th { padding:14px 16px; font-size:0.72rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#9aaa9a; text-align:left; border-bottom:1px solid #eef4ee; white-space:nowrap; }
        td { padding:14px 16px; font-size:0.88rem; border-bottom:1px solid #f5f9f5; vertical-align:middle; }
        tbody tr:last-child td { border-bottom:none; }
        tbody tr:hover { background:#fafcfa; }

        .um-avatar { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#2e7d32,#1b5e20); color:white; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem; flex-shrink:0; }
        .um-name-cell { display:flex; align-items:center; gap:10px; }
        .um-name { font-weight:700; color:#1a2e1a; }
        .um-you-tag { font-size:0.68rem; font-weight:800; color:#9aaa9a; margin-left:6px; }
        .um-email { font-size:0.75rem; color:#9aaa9a; }

        .um-role-select {
          padding:6px 10px; border-radius:8px; border:2px solid #e8f0e8;
          font-size:0.78rem; font-weight:700; font-family:'DM Sans',sans-serif;
          cursor:pointer; outline:none; background:white;
        }
        .um-role-select:disabled { cursor:not-allowed; opacity:0.6; }

        .um-actions { display:flex; gap:8px; align-items:center; }
        .um-btn {
          padding:7px 14px; border-radius:8px; border:none; font-size:0.78rem;
          font-weight:700; cursor:pointer; transition:all 0.18s; font-family:'DM Sans',sans-serif;
          white-space:nowrap;
        }
        .um-btn-del { background:#ffebee; color:#c62828; }
        .um-btn-del:hover:not(:disabled) { background:#c62828; color:white; }
        .um-btn-del:disabled { background:#f5f5f5; color:#bbb; cursor:not-allowed; }

        .um-empty { text-align:center; padding:60px 20px; color:#9aaa9a; }
        .um-empty-icon { font-size:2.5rem; margin-bottom:10px; }
        .um-loading { padding:40px; text-align:center; color:#9aaa9a; font-size:0.9rem; }

        @media(max-width:700px) {
          .um-root { padding:20px; }
          .um-table-wrap { overflow-x:auto; }
        }
      `}</style>

      <div className="um-header">
        <div className="um-title">User Management</div>
        <div className="um-sub">View, search, and manage registered users.</div>
      </div>

      <div className="um-filter-row">
        {FILTERS.map((f) => (
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
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const role = user.role || "adopter";
                const rs = ROLE_STYLE[role] || { bg: "#f5f5f5", color: "#666", label: role };
                const isSelf = user.id === currentUid;
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="um-name-cell">
                        <div className="um-avatar">{(user.name || "?").charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="um-name">
                            {user.name || "—"}
                            {isSelf && <span className="um-you-tag">(you)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "#666" }}>{user.email || "—"}</td>
                    <td>
                      <select
                        className="um-role-select"
                        value={role}
                        disabled={isSelf}
                        title={isSelf ? "You can't change your own role here." : undefined}
                        style={{ color: rs.color, borderColor: rs.color + "55" }}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{ROLE_STYLE[r].label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ color: "#888", fontSize: "0.82rem" }}>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="um-actions">
                        <button
                          className="um-btn um-btn-del"
                          disabled={isSelf}
                          title={isSelf ? "You can't delete your own account here." : undefined}
                          onClick={() => handleDelete(user.id, user.name)}
                        >
                          Delete
                        </button>
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