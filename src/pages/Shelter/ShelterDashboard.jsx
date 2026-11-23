// FILE: src/pages/Shelter/ShelterDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { CheckCircle2, ClipboardList, HeartHandshake, PawPrint, Wallet } from "lucide-react";
import { auth, db } from "../../firebase";
import { PageHeader, StatCard, Card, StatusBadge, Empty, ErrorNote } from "../../layouts/dashboard/ui";

// Firestore serverTimestamp() fields come back as Timestamp objects (with a
// .toDate() method), not strings - new Date(timestamp) on one of those gives
// "Invalid Date". This normalizes any of the shapes we might see.
function toJsDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function ShelterDashboard() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [stats, setStats] = useState({ totalPets: 0, availablePets: 0, pendingAdoptions: 0, successfulAdoptions: 0, donationsReceived: 0, donationsToConfirm: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentPets, setRecentPets] = useState([]);

  useEffect(() => {
    // Wrapped in onAuthStateChanged to prevent race conditions on page refresh
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoadError("");
      try {
        // A pet "posted by this shelter" is the union of two queries: docs where this
        // user is the poster, and docs tagged with this shelter's id.
        const petsByPosterQuery = query(collection(db, "pets"), where("postedBy", "==", currentUser.uid));
        const petsByShelterQuery = query(collection(db, "pets"), where("shelterId", "==", currentUser.uid));
        // The Adopt page saves each application with the pet's poster as `postedBy`
        const requestsQuery = query(collection(db, "applications"), where("postedBy", "==", currentUser.uid));
        const donationsQuery = query(collection(db, "donations"), where("shelterId", "==", currentUser.uid));

        const [petsByPosterSnap, petsByShelterSnap, requestsSnap, donationsSnap] = await Promise.all([
          getDocs(petsByPosterQuery),
          getDocs(petsByShelterQuery),
          getDocs(requestsQuery),
          getDocs(donationsQuery),
        ]);

        const petsById = new Map();
        for (const d of [...petsByPosterSnap.docs, ...petsByShelterSnap.docs]) {
          petsById.set(d.id, { id: d.id, ...d.data() });
        }
        const pets = Array.from(petsById.values());
        const requests = requestsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const donations = donationsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Only confirmed donations count toward the total (older records have no status).
        const received = donations.filter((d) => !d.status || d.status === "Received");

        const sortedRequests = [...requests].sort(
          (a, b) => (toJsDate(b.createdAt || b.date)?.getTime() || 0) - (toJsDate(a.createdAt || a.date)?.getTime() || 0)
        );
        const sortedPets = [...pets].sort((a, b) => (toJsDate(b.createdAt)?.getTime() || 0) - (toJsDate(a.createdAt)?.getTime() || 0));

        setStats({
          totalPets: pets.length,
          availablePets: pets.filter((p) => p.status === "Available").length,
          pendingAdoptions: requests.filter((r) => r.status === "Pending").length,
          successfulAdoptions: pets.filter((p) => p.status === "Adopted").length,
          donationsReceived: received.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
          donationsToConfirm: donations.filter((d) => d.status === "Pending").length,
        });
        setRecentRequests(sortedRequests.slice(0, 5));
        setRecentPets(sortedPets.slice(0, 5));
      } catch (error) {
        console.error("Dashboard Loading Error:", error);
        setLoadError("We couldn't load your dashboard data. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="d-page">
      <PageHeader
        title="Overview"
        subtitle="Here's an overview of your shelter."
        actions={<Link to="/shelter/pets" className="d-btn"><PawPrint size={16} aria-hidden="true" /> Add a pet</Link>}
      />

      {loadError && <ErrorNote>{loadError}</ErrorNote>}

      {stats.donationsToConfirm > 0 && (
        <div className="d-callout" role="status">
          <Wallet size={18} aria-hidden="true" />
          {stats.donationsToConfirm} donation{stats.donationsToConfirm !== 1 ? "s" : ""} waiting for you to confirm.
          <Link to="/shelter/donations">Review now</Link>
        </div>
      )}

      <div className="d-grid">
        <StatCard loading={loading} icon={PawPrint} tone="green" label="Total pets" value={stats.totalPets} to="/shelter/pets" />
        <StatCard loading={loading} icon={CheckCircle2} tone="blue" label="Available pets" value={stats.availablePets} to="/shelter/pets" />
        <StatCard loading={loading} icon={ClipboardList} tone="amber" label="Pending adoptions" value={stats.pendingAdoptions} to="/shelter/adoption-requests" />
        <StatCard loading={loading} icon={HeartHandshake} tone="purple" label="Successful adoptions" value={stats.successfulAdoptions} />
        <StatCard loading={loading} icon={Wallet} tone="green" label="Donations received" value={`₱${stats.donationsReceived.toLocaleString()}`} hint="Confirmed only" to="/shelter/donations" />
      </div>

      <Card title="Recent adoption requests" action={<Link to="/shelter/adoption-requests" className="d-link">View all</Link>} flush>
        {recentRequests.length === 0 ? (
          <Empty icon={ClipboardList} title="No adoption requests yet" text="Applications for your pets will appear here." />
        ) : (
          <div className="d-table-wrap">
            <table className="d-table">
              <thead><tr><th>Applicant</th><th>Pet</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {recentRequests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.fullName || r.applicantName || "Unknown"}</td>
                    <td>{r.petName || "Unknown"}</td>
                    <td>{toJsDate(r.createdAt)?.toLocaleDateString() || "-"}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Recently added pets" action={<Link to="/shelter/pets" className="d-link">Manage pets</Link>} flush>
        {recentPets.length === 0 ? (
          <Empty icon={PawPrint} title="No pets added yet" text="Add your first pet so adopters can find them." action={<Link to="/shelter/pets" className="d-btn ghost">Add a pet</Link>} />
        ) : (
          <div className="d-table-wrap">
            <table className="d-table">
              <thead><tr><th>Pet</th><th>Breed</th><th>Date added</th><th>Status</th></tr></thead>
              <tbody>
                {recentPets.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name || "Unnamed"}</td>
                    <td>{p.breed || "-"}</td>
                    <td>{toJsDate(p.createdAt)?.toLocaleDateString() || "-"}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ShelterDashboard;