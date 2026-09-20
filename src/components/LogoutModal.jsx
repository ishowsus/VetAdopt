import { useEffect } from "react";

// ─── Shared Logout Confirmation Lightbox ─────────────────────────
// Used by AdminLayout, VetLayout and ShelterLayout so every portal
// asks for confirmation before ending the session.
const LogoutModal = ({ open, onCancel, onConfirm, busy = false }) => {
  // Close on Escape
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel, busy]);

  // Lock body scroll while the lightbox is visible
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <style>{`
        .logout-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(2px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: logoutFadeIn 0.15s ease;
        }
        .logout-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 28px 24px 22px;
          width: 100%;
          max-width: 380px;
          text-align: center;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
          animation: logoutPopIn 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
          font-family: system-ui, -apple-system, sans-serif;
        }
        .logout-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 14px;
          border-radius: 50%;
          background: #fee2e2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
        }
        .logout-title {
          margin: 0 0 8px;
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e293b;
        }
        .logout-message {
          margin: 0 0 22px;
          font-size: 0.92rem;
          line-height: 1.5;
          color: #64748b;
        }
        .logout-actions {
          display: flex;
          gap: 10px;
        }
        .logout-cancel-btn {
          flex: 1;
          padding: 11px 0;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .logout-cancel-btn:hover { background: #eef2f7; }
        .logout-confirm-btn {
          flex: 1;
          padding: 11px 0;
          border-radius: 10px;
          border: none;
          background: #dc2626;
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .logout-confirm-btn:hover { background: #b91c1c; }
        .logout-confirm-btn:disabled {
          background: #fca5a5;
          cursor: not-allowed;
        }
        @keyframes logoutFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes logoutPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        className="logout-overlay"
        onClick={busy ? undefined : onCancel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
      >
        <div className="logout-card" onClick={(e) => e.stopPropagation()}>
          <div className="logout-icon">🚪</div>
          <h3 className="logout-title" id="logout-modal-title">
            Log out?
          </h3>
          <p className="logout-message">
            Are you sure you want to log out of your account? You will need to
            sign in again to access your dashboard.
          </p>
          <div className="logout-actions">
            <button
              type="button"
              className="logout-cancel-btn"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="logout-confirm-btn"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "Logging out..." : "Log Out"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogoutModal;