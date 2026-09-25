import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebase";

// ─── Shared constants ─────────────────────────────────────────────────────────
export const STATUS_COLORS = {
  pending: { bg: "#fff3e0", color: "#e65100" },
  confirmed: { bg: "#e8f5e9", color: "#2e7d32" },
  completed: { bg: "#e3f2fd", color: "#1565c0" },
  cancelled: { bg: "#fdecea", color: "#b3261e" },
};

// ─── Date / time helpers ──────────────────────────────────────────────────────
// Local YYYY-MM-DD. (toISOString() is UTC, which gives "yesterday" in the
// Philippines before 8 AM.)
export const todayString = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// "9:00 AM" / "2:30 PM" / "14:30" -> minutes since midnight, so "10:00 AM"
// sorts after "9:00 AM" (plain string compare gets this wrong).
export const timeToMinutes = (t = "") => {
  const m = /^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i.exec(String(t).trim());
  if (!m) return 0;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
};

export const byDateTime = (a, b) => {
  const d = (a.date || "").localeCompare(b.date || "");
  if (d !== 0) return d;
  return timeToMinutes(a.time) - timeToMinutes(b.time);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "No date";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
// auth.currentUser is null for a moment after a page refresh, so wait for
// Firebase to tell us who is signed in.
export function useAuthUser() {
  const [state, setState] = useState({ user: auth.currentUser, ready: false });

  useEffect(
    () => onAuthStateChanged(auth, (user) => setState({ user, ready: true })),
    []
  );

  return state;
}

// Live list of appointments booked with THIS vet (booking screen saves vetId).
export function useVetAppointments() {
  const { user, ready } = useAuthUser();
  const uid = user?.uid;
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!uid) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "appointments"), where("vetId", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort(byDateTime);
        setAppointments(data);
        setError("");
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [ready, uid]);

  return { appointments, loading, error, user };
}

// ─── Patients ─────────────────────────────────────────────────────────────────
// A "patient" is a pet that has at least one non-cancelled appointment with
// this vet. Change this list if you only want confirmed/completed pets.
export const PATIENT_STATUSES = ["pending", "confirmed", "completed"];

export function buildPatients(appointments) {
  const today = todayString();
  const map = new Map();

  appointments
    .filter((a) => PATIENT_STATUSES.includes(a.status))
    .forEach((appt) => {
      const name = (appt.petName || "").trim();
      if (!name && !appt.petId) return;

      // petId when the booking has one, otherwise owner + pet name.
      const key = appt.petId || `${appt.userId || "unknown"}::${name.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          petId: appt.petId || null,
          name: name || "Unnamed pet",
          ownerName: appt.ownerName || "",
          userId: appt.userId || null,
          visits: [],
        });
      }
      map.get(key).visits.push(appt);
    });

  return Array.from(map.values())
    .map((p) => {
      const visits = p.visits.slice().sort(byDateTime); // oldest -> newest
      const upcoming = visits.filter(
        (v) => (v.status === "pending" || v.status === "confirmed") && (v.date || "") >= today
      );
      const done = visits.filter((v) => v.status === "completed");
      return {
        ...p,
        visits,
        visitCount: visits.length,
        nextVisit: upcoming[0] || null,
        lastVisit: done[done.length - 1] || null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
