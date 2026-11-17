import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { auth, db } from "../../firebase";

/**
 * Admin: approve or decline pets that adopters submitted for rehoming.
 *
 * Approve  -> status "Available", owner is notified the listing is live.
 * Decline  -> status "Rejected" (kept as "Rejected" so existing rules/queries still work),
 *             a reason is required and is sent to the owner so they know what to fix.
 */

const QUICK_REASONS = [
  "Photos are unclear or look like stock images.",
  "Listing mentions a price or sale. Rehoming must be free or fee-based only through the shelter.",
  "Health or vaccination details are missing.",
  "Description is too short or incomplete.",
  "We couldn't verify this listing and it looks suspicious.",
];

export default function Listings() {
  const [items, setItems] = useState([]);
  const [owners, setOwners] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // { text, kind }
  const [notes, setNotes] = useState({});
  const [declining, setDeclining] = useState({}); // id -> true while the decline form is open
  const [itemError, setItemError] = useState({});
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const q = query(collection(db, "pets"), where("status", "==", "Pending Review"));
    return onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Couldn't load listings.");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    const missing = [...new Set(items.map((i) => i.postedBy).filter(Boolean))].filter((id) => !owners[id]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (id) => {
        try {
          const s = await getDoc(doc(db, "users", id));
          const d = s.exists() ? s.data() : {};
          return [id, { name: d.name || d.displayName || "Unknown", email: d.email || "", verified: d.isVerified === true }];
        } catch {
          return [id, { name: "Unknown", email: "", verified: false }];
        }
      })
    ).then((pairs) => setOwners((prev) => ({ ...prev, ...Object.fromEntries(pairs) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Auto-hide the success message.
  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => setDone(null), 4500);
    return () => clearTimeout(t);
  }, [done]);

  const setNote = (id, value) => setNotes((n) => ({ ...n, [id]: value }));
  const setItemErr = (id, msg) => setItemError((e) => ({ ...e, [id]: msg }));

  const addQuickReason = (id, reason) => {
    const cur = (notes[id] || "").trim();
    if (cur.includes(reason)) return;
    setNote(id, cur ? `${cur} ${reason}` : reason);
    setItemErr(id, "");
  };

  const openDecline = (id) => {
    setDeclining((d) => ({ ...d, [id]: true }));
    setItemErr(id, "");
  };
  const cancelDecline = (id) => {
    setDeclining((d) => ({ ...d, [id]: false }));
    setItemErr(id, "");
  };

  const decide = async (p, approve) => {
    const note = (notes[p.id] || "").trim();
    if (!approve && !note) {
      setItemErr(p.id, "Add a reason before declining, so the owner knows what to fix.");
      return;
    }
    setBusyId(p.id);
    setError("");
    setItemErr(p.id, "");
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "pets", p.id), {
        status: approve ? "Available" : "Rejected",
        reviewNote: approve ? "" : note,
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser.uid,
      });
      if (p.postedBy) {
        batch.set(doc(collection(db, "notifications")), {
          userId: p.postedBy,
          text: approve
            ? `${p.name} is now live and can be found by adopters.`
            : `Your listing for ${p.name} wasn't approved. Reason: ${note}`,
          type: "listing",
          createdAt: serverTimestamp(),
          read: false,
        });
      }
      await batch.commit();
      setDone({ kind: approve ? "ok" : "no", text: approve ? `${p.name} was approved and is now live.` : `${p.name} was declined. The owner has been notified.` });
      setDeclining((d) => ({ ...d, [p.id]: false }));
    } catch (e) {
      console.error(e);
      setItemErr(p.id, "Couldn't save that decision. Please try again.");
    }
    setBusyId("");
  };

  return (
    <div className="ls-page">
      <style>{CSS}</style>

      <header className="ls-head">
        <div>
          <h2>Pet listings to review</h2>
          <p>Check the photos and details. Look for sale prices, stock photos and anything that looks like a scam.</p>
        </div>
        {!loading && <span className="ls-count">{items.length} pending</span>}
      </header>

      {error && <div role="alert" className="ls-alert ls-alert-err">{error}</div>}
      {done && <div role="status" className={`ls-alert ${done.kind === "ok" ? "ls-alert-ok" : "ls-alert-no"}`}>{done.text}</div>}

      {loading ? (
        <p className="ls-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="ls-empty">
          <strong>All caught up</strong>
          <span>Nothing is waiting for review.</span>
        </div>
      ) : (
        items.map((p) => {
          const o = owners[p.postedBy] || {};
          const busy = busyId === p.id;
          const isDeclining = !!declining[p.id];
          const photos = (p.photos?.length ? p.photos : [p.photoUrl]).filter(Boolean);
          return (
            <article key={p.id} className="ls-card">
              <div className="ls-top">
                <strong className="ls-name">{p.name}</strong>
                <span className="ls-by">
                  Posted by {o.name || "…"}
                  {o.verified && <span className="ls-verified">ID verified</span>}
                  {o.email ? ` · ${o.email}` : ""}
                </span>
              </div>

              {photos.length > 0 ? (
                <div className="ls-photos">
                  {photos.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                      <img src={src} alt={p.name} />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="ls-warn">No photos were uploaded.</p>
              )}

              <dl className="ls-dl">
                <dt>Details</dt><dd>{[p.type, p.breed, p.age, p.gender, p.city].filter(Boolean).join(" · ") || "Not stated"}</dd>
                <dt>Health</dt><dd>{(p.tags || []).join(", ") || "Not stated"}</dd>
                <dt>About</dt><dd>{p.description || "Not stated"}</dd>
                <dt>Reason</dt><dd>{p.reason || "Not stated"}</dd>
              </dl>

              {isDeclining ? (
                <div className="ls-decline">
                  <label htmlFor={`reason-${p.id}`}>Why are you declining this listing?</label>
                  <div className="ls-chips">
                    {QUICK_REASONS.map((r) => (
                      <button key={r} type="button" className="ls-chip" onClick={() => addQuickReason(p.id, r)}>
                        + {r.length > 38 ? `${r.slice(0, 36)}…` : r}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id={`reason-${p.id}`}
                    rows={3}
                    placeholder="This message is sent to the owner."
                    value={notes[p.id] || ""}
                    onChange={(e) => { setNote(p.id, e.target.value); setItemErr(p.id, ""); }}
                  />
                  {itemError[p.id] && <div role="alert" className="ls-inline-err">{itemError[p.id]}</div>}
                  <div className="ls-actions">
                    <button type="button" className="ls-btn ls-btn-no-solid" disabled={busy} onClick={() => decide(p, false)}>
                      {busy ? "Saving…" : "Confirm decline"}
                    </button>
                    <button type="button" className="ls-btn ls-btn-ghost" disabled={busy} onClick={() => cancelDecline(p.id)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {itemError[p.id] && <div role="alert" className="ls-inline-err">{itemError[p.id]}</div>}
                  <div className="ls-actions">
                    <button type="button" className="ls-btn ls-btn-ok" disabled={busy} onClick={() => decide(p, true)}>
                      {busy ? "Saving…" : "Approve"}
                    </button>
                    <button type="button" className="ls-btn ls-btn-no" disabled={busy} onClick={() => openDecline(p.id)}>
                      Decline
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}

const CSS = `
.ls-page { padding: 30px 20px; max-width: 900px; margin: 0 auto; color: #0f172a; }
.ls-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
.ls-head h2 { margin: 0 0 4px; }
.ls-head p { margin: 0; color: #607d8b; font-size: 14px; }
.ls-count { flex-shrink: 0; padding: 6px 12px; border-radius: 999px; background: #ecfdf5; color: #15803d; font-weight: 700; font-size: 13px; }
.ls-muted { color: #90a4ae; }
.ls-alert { padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 14px; }
.ls-alert-err { background: #fee2e2; color: #b91c1c; }
.ls-alert-ok { background: #dcfce7; color: #166534; }
.ls-alert-no { background: #fef3c7; color: #92400e; }
.ls-empty { display: flex; flex-direction: column; gap: 4px; align-items: center; padding: 40px 20px; border: 2px dashed #cfd8dc; border-radius: 16px; color: #607d8b; text-align: center; }
.ls-empty strong { color: #15803d; font-size: 1.05rem; }
.ls-card { background: #fff; border-radius: 16px; padding: 18px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.07); border-left: 5px solid #2e7d32; }
.ls-top { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.ls-name { font-size: 18px; }
.ls-by { font-size: 13px; color: #607d8b; }
.ls-verified { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; }
.ls-photos { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
.ls-photos img { width: 120px; height: 120px; object-fit: cover; border-radius: 12px; display: block; transition: transform .15s ease; }
.ls-photos a:hover img { transform: scale(1.04); }
.ls-warn { margin: 10px 0; padding: 8px 12px; border-radius: 8px; background: #fef3c7; color: #92400e; font-size: 13px; }
.ls-dl { margin: 8px 0 14px; font-size: 14px; display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; }
.ls-dl dt { color: #607d8b; }
.ls-dl dd { margin: 0; }
.ls-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.ls-btn { padding: 11px 22px; border-radius: 12px; font: inherit; font-weight: 700; cursor: pointer; border: 2px solid transparent; transition: transform .1s ease, background .15s ease, opacity .15s ease; }
.ls-btn:active:not(:disabled) { transform: scale(.97); }
.ls-btn:disabled { opacity: .6; cursor: not-allowed; }
.ls-btn:focus-visible, .ls-chip:focus-visible { outline: 3px solid #22c55e; outline-offset: 2px; }
.ls-btn-ok { background: #2e7d32; color: #fff; }
.ls-btn-ok:hover:not(:disabled) { background: #256528; }
.ls-btn-no { background: #fff; color: #b91c1c; border-color: #b91c1c; }
.ls-btn-no:hover:not(:disabled) { background: #fef2f2; }
.ls-btn-no-solid { background: #b91c1c; color: #fff; }
.ls-btn-no-solid:hover:not(:disabled) { background: #991b1b; }
.ls-btn-ghost { background: transparent; color: #475569; border-color: #cbd5e1; }
.ls-btn-ghost:hover:not(:disabled) { background: #f1f5f9; }
.ls-decline { padding: 14px; border-radius: 14px; background: #fef2f2; border: 1px solid #fecaca; }
.ls-decline label { display: block; margin-bottom: 8px; font-weight: 700; font-size: 14px; color: #7f1d1d; }
.ls-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.ls-chip { padding: 5px 10px; border: 1px solid #fca5a5; border-radius: 999px; background: #fff; color: #991b1b; font: inherit; font-size: 12px; cursor: pointer; }
.ls-chip:hover { background: #fee2e2; }
.ls-decline textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #cfd8dc; border-radius: 10px; font: inherit; resize: vertical; margin-bottom: 10px; }
.ls-inline-err { margin: 0 0 10px; color: #b91c1c; font-size: 13px; font-weight: 600; }
@media (max-width: 520px) { .ls-actions .ls-btn { flex: 1; } .ls-dl { grid-template-columns: 1fr; } .ls-dl dt { font-weight: 700; } }
`;