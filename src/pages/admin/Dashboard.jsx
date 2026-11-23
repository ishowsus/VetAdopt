// FILE: src/pages/admin/Dashboard.jsx  (rename the file to Dashboard.jsx)
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { CalendarDays, ClipboardList, Flag, ListChecks, ShieldCheck, Users } from "lucide-react";
import { db } from "../../firebase";
import { PageHeader, StatCard, Card, ErrorNote } from "../../layouts/dashboard/ui";

const count = (q) => getCountFromServer(q).then((s) => s.data().count);

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const jobs = {
      users: count(collection(db, "users")),
      applications: count(collection(db, "applications")),
      appointments: count(collection(db, "appointments")),
      reports: count(collection(db, "reports")),
      verifications: count(query(collection(db, "verifications"), where("status", "==", "pending"))),
      listings: count(query(collection(db, "pets"), where("status", "==", "Pending Review"))),
    };
    // allSettled: one failing count shouldn't blank the whole dashboard
    Promise.allSettled(Object.values(jobs)).then((results) => {
      if (!alive) return;
      const next = {};
      let failed = false;
      Object.keys(jobs).forEach((k, i) => {
        if (results[i].status === "fulfilled") next[k] = results[i].value;
        else {
          failed = true;
          console.error(`Count failed for ${k}:`, results[i].reason);
        }
      });
      setStats(next);
      if (failed) setError("Some numbers couldn't load. Check that the latest Firestore rules are published.");
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const n = (k) => (stats[k] ?? "–").toLocaleString?.() ?? "–";
  const waiting = (stats.verifications || 0) + (stats.listings || 0);

  return (
    <div className="d-page">
      <PageHeader title="Overview" subtitle="System metrics and the things waiting for you." />

      {error && <ErrorNote>{error}</ErrorNote>}

      <Card title={waiting > 0 ? `Needs your attention (${waiting})` : "Needs your attention"}>
        <div className="d-grid" style={{ margin: "12px 0 0" }}>
          <StatCard loading={loading} icon={ShieldCheck} tone={stats.verifications ? "amber" : "green"} label="Verification requests" value={n("verifications")} hint="Licenses, permits and IDs" to="/admin/verifications" />
          <StatCard loading={loading} icon={ListChecks} tone={stats.listings ? "amber" : "green"} label="Pet listings to approve" value={n("listings")} hint="Adopters rehoming pets" to="/admin/listings" />
        </div>
      </Card>

      <div className="d-grid">
        <StatCard loading={loading} icon={Users} tone="green" label="Registered users" value={n("users")} to="/admin/users" />
        <StatCard loading={loading} icon={ClipboardList} tone="amber" label="Adoption requests" value={n("applications")} />
        <StatCard loading={loading} icon={CalendarDays} tone="blue" label="Vet appointments" value={n("appointments")} />
        <StatCard loading={loading} icon={Flag} tone="red" label="Reports" value={n("reports")} to="/admin/reports" />
      </div>

      <Card title="Quick links">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "12px 0 4px" }}>
          <Link to="/admin/verifications" className="d-btn">Verification requests</Link>
          <Link to="/admin/listings" className="d-btn ghost">Pet listings</Link>
          <Link to="/admin/users" className="d-btn ghost">Manage users</Link>
          <Link to="/admin/reports" className="d-btn ghost">View reports</Link>
          <Link to="/admin/settings" className="d-btn ghost">Settings</Link>
        </div>
      </Card>
    </div>
  );
}