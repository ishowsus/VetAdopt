import { Link } from "react-router-dom";

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="d-head">
      <div>
        <h2 className="d-title">{title}</h2>
        {subtitle && <p className="d-sub">{subtitle}</p>}
      </div>
      {actions && <div className="d-actions">{actions}</div>}
    </div>
  );
}

// tone: green | amber | red | blue | purple | gray
export function StatCard({ icon: Icon, label, value, hint, tone = "green", to, loading }) {
  const body = (
    <>
      <div className={`d-stat-icon tone-${tone}`}>{Icon && <Icon size={22} aria-hidden="true" />}</div>
      <div>
        {loading ? <div className="d-skel" style={{ width: 56, height: 26 }} /> : <div className="d-stat-value">{value}</div>}
        <div className="d-stat-label">{label}</div>
        {hint && !loading && <div className="d-stat-hint">{hint}</div>}
      </div>
    </>
  );
  return to ? <Link to={to} className="d-stat">{body}</Link> : <div className="d-stat">{body}</div>;
}

export function Card({ title, action, children, flush }) {
  return (
    <section className="d-card">
      {(title || action) && (
        <div className="d-card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {flush ? children : <div className="d-card-body">{children}</div>}
    </section>
  );
}

export function Badge({ tone = "gray", children }) {
  return <span className={`d-badge tone-${tone}`}>{children}</span>;
}

const TONES = {
  pending: "amber", pending_vet: "amber", open: "amber", "needs changes": "amber",
  approved: "green", confirmed: "green", available: "green", received: "green", verified: "green", live: "green",
  rejected: "red", declined: "red", cancelled: "red", "not received": "red",
  adopted: "blue", completed: "blue",
};
export const statusTone = (status) => TONES[String(status || "").toLowerCase()] || "gray";
export const StatusBadge = ({ status }) => <Badge tone={statusTone(status)}>{status || "Unknown"}</Badge>;

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="d-empty">
      {Icon && <div className="d-empty-icon"><Icon size={24} aria-hidden="true" /></div>}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export const ErrorNote = ({ children }) => <div role="alert" className="d-error">{children}</div>;
export const Skeleton = ({ w = "100%", h = 16 }) => <div className="d-skel" style={{ width: w, height: h }} />;