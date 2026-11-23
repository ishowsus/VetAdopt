// FILE: src/pages/Veterinarian/VetDashboard.jsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bell, CalendarDays, CheckCircle2, FileText, MessageSquare, PawPrint, User } from "lucide-react";
import { useVetAppointments, buildPatients, todayString, timeToMinutes, formatDate } from "./vetHelpers";
import { PageHeader, StatCard, Card, StatusBadge, Empty, ErrorNote } from "../../layouts/dashboard/ui";

function Dashboard() {
  const { appointments, loading, error, user } = useVetAppointments();

  const { stats, upcoming } = useMemo(() => {
    const today = todayString();
    const active = appointments.filter((a) => a.status !== "cancelled");

    const stats = {
      registeredPatients: buildPatients(appointments).length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      pending: appointments.filter((a) => a.status === "pending").length,
      today: active.filter((a) => a.date === today).length,
      total: appointments.length,
    };

    // Next 5 pending / confirmed visits from today onward
    const upcoming = appointments
      .filter((a) => (a.status === "pending" || a.status === "confirmed") && (a.date || "") >= today)
      .sort((a, b) => (a.date || "").localeCompare(b.date || "") || timeToMinutes(a.time) - timeToMinutes(b.time))
      .slice(0, 5);

    return { stats, upcoming };
  }, [appointments]);

  if (!loading && !user) {
    return <div className="d-page"><Empty icon={User} title="Please log in" text="Log in to see your dashboard." /></div>;
  }

  return (
    <div className="d-page">
      <PageHeader
        title="Overview"
        subtitle="Your appointments and patients at a glance."
        actions={<Link to="/vet/medical-records" className="d-btn"><FileText size={16} aria-hidden="true" /> Add a medical record</Link>}
      />

      {error && <ErrorNote>Couldn't load appointments: {error}</ErrorNote>}

      <div className="d-grid">
        <StatCard loading={loading} icon={PawPrint} tone="purple" label="Registered patients" value={stats.registeredPatients} hint="Pets booked with you" to="/vet/patients" />
        <StatCard loading={loading} icon={CheckCircle2} tone="green" label="Confirmed" value={stats.confirmed} hint="Accepted by you" to="/vet/appointments" />
        <StatCard loading={loading} icon={Bell} tone="amber" label="Pending requests" value={stats.pending} hint="Waiting for your reply" to="/vet/appointments" />
        <StatCard loading={loading} icon={CalendarDays} tone="blue" label="Today" value={stats.today} hint={`${stats.total} appointments in total`} to="/vet/appointments" />
      </div>

      <div className="d-two">
        <Card title="Upcoming appointments" action={<Link to="/vet/appointments" className="d-link">View all</Link>}>
          {upcoming.length === 0 ? (
            <Empty
              icon={CalendarDays}
              title="No upcoming appointments"
              text="New requests from adopters will show up here."
              action={<Link to="/vet/profile" className="d-btn ghost">Set your availability</Link>}
            />
          ) : (
            upcoming.map((appt) => (
              <div key={appt.id} className="d-row">
                <div className="d-initial" aria-hidden="true">{(appt.petName || "P").charAt(0).toUpperCase()}</div>
                <div className="d-row-main">
                  <strong>{appt.petName || "Pet"} <span style={{ display: "inline", fontWeight: 400 }}>({appt.ownerName || "Owner"})</span></strong>
                  <span>
                    {formatDate(appt.date)} at {appt.time || "N/A"}
                    {appt.service && ` · ${appt.service}`}
                  </span>
                </div>
                <StatusBadge status={appt.status || "pending"} />
              </div>
            ))
          )}
        </Card>

        <Card title="Quick actions">
          <div className="d-row"><Link to="/vet/patients" className="d-link"><PawPrint size={16} style={{ verticalAlign: "-3px" }} /> See your patients</Link></div>
          <div className="d-row"><Link to="/vet/medical-records" className="d-link"><FileText size={16} style={{ verticalAlign: "-3px" }} /> Write a medical record</Link></div>
          <div className="d-row"><Link to="/vet/messages" className="d-link"><MessageSquare size={16} style={{ verticalAlign: "-3px" }} /> Reply to messages</Link></div>
          <div className="d-row"><Link to="/vet/profile" className="d-link"><User size={16} style={{ verticalAlign: "-3px" }} /> Update your profile and hours</Link></div>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;