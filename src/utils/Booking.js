import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch } from "firebase/firestore";

/*
 * Booking model (used for vet appointments AND shelter visits)
 *   availability/{providerId}   weekly hours, days off, slot length, on/off switch
 *   bookings/{id}               one request: who, with whom, date, time, status
 *   slots/{providerId_date_start}  a lock: only one booking can ever claim a time
 * Times are stored as "HHMM" strings (e.g. "0930") and dates as "YYYY-MM-DD".
 */

export const DAYS = [
  ["sun", "Sunday"], ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"],
  ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"],
];
const DAY_KEYS = DAYS.map((d) => d[0]);
export const emptyWeek = () => Object.fromEntries(DAY_KEYS.map((k) => [k, []]));

export const fmtTime = (hhmm) => {
  if (!hhmm || hhmm.length !== 4) return "";
  let h = Number(hhmm.slice(0, 2));
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${hhmm.slice(2)} ${ap}`;
};
export const toInputTime = (hhmm) => (hhmm ? `${hhmm.slice(0, 2)}:${hhmm.slice(2)}` : "");
export const fromInputTime = (v) => v.replace(":", "");

export const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDateKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const prettyDate = (k) =>
  parseDateKey(k).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2));
const fromMinutes = (n) => String(Math.floor(n / 60)).padStart(2, "0") + String(n % 60).padStart(2, "0");
export const slotId = (providerId, date, start) => `${providerId}_${date}_${start}`;

// Open times on one date, minus days off, taken times, and anything under an hour away.
export function generateSlots(avail, dateStr, taken = new Set(), now = new Date()) {
  if (!avail?.accepting || (avail.daysOff || []).includes(dateStr)) return [];
  const day = parseDateKey(dateStr);
  const windows = avail.weekly?.[DAY_KEYS[day.getDay()]] || [];
  const step = avail.slotMinutes || 30;
  const found = new Map();
  windows.forEach((w) => {
    for (let t = toMinutes(w.start); t + step <= toMinutes(w.end); t += step) {
      const startsAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(t / 60), t % 60);
      const start = fromMinutes(t);
      if (startsAt.getTime() < now.getTime() + 60 * 60 * 1000) continue; // at least 1 hour notice
      if (taken.has(start)) continue;
      found.set(start, { start, end: fromMinutes(t + step) });
    }
  });
  return [...found.values()].sort((a, b) => a.start.localeCompare(b.start));
}

/* ───────────── live data ───────────── */

export function useAvailability(providerId) {
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    if (!providerId) {
      setState({ loading: false, data: null });
      return undefined;
    }
    return onSnapshot(
      doc(db, "availability", providerId),
      (snap) => setState({ loading: false, data: snap.exists() ? snap.data() : null }),
      () => setState({ loading: false, data: null })
    );
  }, [providerId]);
  return state;
}

export function useTakenSlots(providerId, date) {
  const [taken, setTaken] = useState(new Set());
  useEffect(() => {
    setTaken(new Set());
    if (!providerId || !date) return undefined;
    const q = query(collection(db, "slots"), where("providerId", "==", providerId), where("date", "==", date));
    return onSnapshot(q, (snap) => setTaken(new Set(snap.docs.map((d) => d.data().start))), () => {});
  }, [providerId, date]);
  return taken;
}

// field: "userId" (an adopter's bookings) or "providerId" (a vet's / shelter's requests)
export function useBookings(field, uid) {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  useEffect(() => {
    if (!uid) {
      setState({ loading: false, items: [], error: "" });
      return undefined;
    }
    const q = query(collection(db, "bookings"), where(field, "==", uid));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
        setState({ loading: false, items, error: "" });
      },
      (err) => {
        console.error(err);
        setState({ loading: false, items: [], error: "Couldn't load bookings." });
      }
    );
  }, [field, uid]);
  return state;
}

/* ───────────── writes ───────────── */

export async function createBooking({ meId, myName, provider, pet = null, note = "", date, slot }) {
  const type = provider.role === "shelter" ? "shelter_visit" : "vet_appointment";
  const bookingRef = doc(collection(db, "bookings"));
  const batch = writeBatch(db);

  batch.set(bookingRef, {
    providerId: provider.id,
    providerRole: provider.role,
    providerName: provider.name,
    userId: meId,
    userName: myName,
    ...(pet ? { petId: pet.id, petName: pet.name } : {}),
    type,
    date,
    start: slot.start,
    end: slot.end,
    note: note.trim().slice(0, 300),
    status: "Pending",
    createdAt: serverTimestamp(),
  });
  // The lock. If someone else took this time first, this write is refused and the whole batch fails.
  batch.set(doc(db, "slots", slotId(provider.id, date, slot.start)), {
    providerId: provider.id,
    date,
    start: slot.start,
    bookingId: bookingRef.id,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, "notifications")), {
    userId: provider.id,
    text: `📅 ${myName} requested ${type === "shelter_visit" ? "a visit" : "an appointment"} on ${prettyDate(date)} at ${fmtTime(slot.start)}${pet ? ` for ${pet.name}` : ""}.`,
    type: "booking",
    createdAt: serverTimestamp(),
    read: false,
  });
  await batch.commit();
  return bookingRef.id;
}

const VERB = { Confirmed: "confirmed", Declined: "declined", Cancelled: "cancelled", Completed: "marked as completed" };

export async function updateBookingStatus(b, status, { actorId, actorName, providerNote = "" }) {
  const isProvider = actorId === b.providerId;
  const batch = writeBatch(db);
  batch.update(doc(db, "bookings", b.id), {
    status,
    updatedAt: serverTimestamp(),
    ...(isProvider && providerNote.trim() ? { providerNote: providerNote.trim().slice(0, 300) } : {}),
  });
  if (status === "Declined" || status === "Cancelled") {
    batch.delete(doc(db, "slots", slotId(b.providerId, b.date, b.start))); // frees the time
  }
  batch.set(doc(collection(db, "notifications")), {
    userId: isProvider ? b.userId : b.providerId,
    text: `📅 ${actorName} ${VERB[status]} the booking on ${prettyDate(b.date)} at ${fmtTime(b.start)}.${isProvider && providerNote.trim() ? ` Note: ${providerNote.trim().slice(0, 120)}` : ""}`,
    type: "booking",
    createdAt: serverTimestamp(),
    read: false,
  });
  await batch.commit();
}

/* ───────────── after a shelter visit ───────────── */

export const OUTCOMES = {
  match: { icon: "💚", label: "It's a match" },
  another_visit: { icon: "🤔", label: "Needs another visit" },
  not_a_match: { icon: "🐾", label: "Not a match" },
};

// The shelter records how the visit went. This also closes the booking as Completed.
export async function recordVisitOutcome(b, outcome, { actorName, note = "" }) {
  const n = note.trim().slice(0, 300);
  const pet = b.petName || "the pet";
  const text = {
    match: `💚 ${actorName} thinks you and ${pet} are a great match! You can apply to adopt ${pet} now.${n ? ` Note: ${n}` : ""}`,
    another_visit: `🤔 ${actorName} would like you and ${pet} to meet again before deciding.${n ? ` Note: ${n}` : ""}`,
    not_a_match: `${actorName} doesn't think ${pet} is the right match this time.${n ? ` Note: ${n}` : ""} There are many other pets waiting.`,
  }[outcome];

  const batch = writeBatch(db);
  batch.update(doc(db, "bookings", b.id), {
    status: "Completed",
    visitOutcome: outcome,
    outcomeNote: n,
    outcomeAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, "notifications")), {
    userId: b.userId,
    text,
    type: "match",
    createdAt: serverTimestamp(),
    read: false,
  });
  await batch.commit();
}

// The adopter says how they felt about the pet after the visit.
export async function setAdopterInterest(b, interest, { actorName }) {
  const pet = b.petName || "the pet";
  const batch = writeBatch(db);
  batch.update(doc(db, "bookings", b.id), { adopterInterest: interest, updatedAt: serverTimestamp() });
  batch.set(doc(collection(db, "notifications")), {
    userId: b.providerId,
    text:
      interest === "interested"
        ? `❤️ ${actorName} loved meeting ${pet} and is interested in adopting.`
        : `${actorName} met ${pet} but feels it isn't the right fit.`,
    type: "match",
    createdAt: serverTimestamp(),
    read: false,
  });
  await batch.commit();
}