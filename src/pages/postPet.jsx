import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { uploadPetPhoto, PET_PHOTO_TYPES, MAX_PET_PHOTO_BYTES } from "../utils/PetPhotos";

const TYPES = ["Dog", "Cat", "Rabbit", "Bird", "Other"];
const AGES = ["Baby", "Young", "Adult", "Senior"];
const GENDERS = ["Male", "Female"];
const MAX_PHOTOS = 3;

const EMPTY = {
  name: "", type: "", breed: "", age: "", gender: "", city: "",
  description: "", reason: "", vaccinated: false, neutered: false,
  ownsPet: false, noSale: false, safeMeet: false,
};

const STATUS = {
  "Pending Review": { bg: "#fef3c7", fg: "#92400e", label: "Waiting for approval" },
  Available: { bg: "#d1fae5", fg: "#065f46", label: "Live" },
  Rejected: { bg: "#fee2e2", fg: "#b91c1c", label: "Not approved" },
  Adopted: { bg: "#f1f5f9", fg: "#475569", label: "Adopted" },
};

export default function PostPet() {
  const [user, setUser] = useState(undefined);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [listings, setListings] = useState([]);
  const [busyId, setBusyId] = useState("");

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  useEffect(() => {
    if (!user) return undefined;
    const q = query(collection(db, "pets"), where("postedBy", "==", user.uid));
    return onSnapshot(
      q,
      (snap) =>
        setListings(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds ?? 9e9) - (a.createdAt?.seconds ?? 9e9))
        ),
      (err) => console.error(err)
    );
  }, [user]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  const addFiles = (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = "";
    const bad = picked.find((f) => !PET_PHOTO_TYPES.includes(f.type) || f.size > MAX_PET_PHOTO_BYTES);
    if (bad) {
      setErrors((er) => ({ ...er, photos: "Use JPEG, PNG or WEBP photos under 15 MB." }));
      return;
    }
    setFiles((cur) => [...cur, ...picked].slice(0, MAX_PHOTOS));
    setErrors((er) => ({ ...er, photos: "" }));
  };

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Enter the pet's name.";
    if (!form.type) e.type = "Choose a type.";
    if (!form.age) e.age = "Choose an age group.";
    if (!form.gender) e.gender = "Choose a gender.";
    if (!form.city.trim()) e.city = "Enter your city or area.";
    if (form.description.trim().length < 30) e.description = "Tell us a bit more (at least 30 characters).";
    if (form.reason.trim().length < 15) e.reason = "Please explain why you're rehoming (at least 15 characters).";
    if (files.length === 0) e.photos = "Add at least one clear photo.";
    if (!form.ownsPet) e.ownsPet = "Please confirm to continue.";
    if (!form.noSale) e.noSale = "Please confirm to continue.";
    if (!form.safeMeet) e.safeMeet = "Please confirm to continue.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const u = auth.currentUser;
      await u.reload();
      if (!u.emailVerified) throw new Error("Please verify your email first. You can do it from your profile page.");
      await u.getIdToken(true);

      const urls = [];
      for (let i = 0; i < files.length; i += 1) urls.push(await uploadPetPhoto(files[i], u.uid, i));

      await addDoc(collection(db, "pets"), {
        name: form.name.trim(),
        type: form.type,
        breed: form.breed.trim(),
        age: form.age,
        gender: form.gender,
        city: form.city.trim(),
        location: form.city.trim(),
        description: form.description.trim(),
        reason: form.reason.trim(),
        vaccinated: form.vaccinated,
        neutered: form.neutered,
        tags: [form.vaccinated && "Vaccinated", form.neutered && "Neutered"].filter(Boolean),
        photoUrl: urls[0],
        photos: urls,
        status: "Pending Review", // an admin approves it before it goes live
        postedBy: u.uid,
        postedByRole: "owner",
        userId: u.uid,
        createdAt: serverTimestamp(),
      });
      setForm(EMPTY);
      setFiles([]);
      setNotice("Submitted! We'll review your listing, and you'll get a notification when it's live.");
    } catch (err) {
      console.error(err);
      setError(
        err.code === "permission-denied"
          ? "We couldn't submit your listing. Make sure your email is verified, then try again."
          : err.message || "Something went wrong. Try again."
      );
    }
    setSubmitting(false);
  };

  const markAdopted = async (p) => {
    setBusyId(p.id);
    try {
      await updateDoc(doc(db, "pets", p.id), { status: "Adopted" });
    } catch (e) {
      console.error(e);
      setError("Couldn't update that listing.");
    }
    setBusyId("");
  };
  const remove = async (p) => {
    if (!window.confirm(`Remove ${p.name}'s listing?`)) return;
    setBusyId(p.id);
    try {
      await deleteDoc(doc(db, "pets", p.id));
    } catch (e) {
      console.error(e);
      setError("Couldn't remove that listing.");
    }
    setBusyId("");
  };

  if (user === undefined) return <p style={{ padding: 40 }}>Loading…</p>;
  if (user === null) return <p style={{ padding: 40 }}>Please <Link to="/login">log in</Link> to rehome a pet.</p>;

  const field = (key, label, control, hint) => (
    <div style={s.field}>
      <label htmlFor={`pp-${key}`} style={s.label}>{label}</label>
      {control}
      {hint && !errors[key] && <p style={s.hint}>{hint}</p>}
      {errors[key] && <p role="alert" style={s.err}>{errors[key]}</p>}
    </div>
  );
  const input = (key, props = {}) => (
    <input id={`pp-${key}`} style={{ ...s.input, ...(errors[key] ? s.bad : {}) }} value={form[key]} onChange={set(key)} {...props} />
  );
  const select = (key, options) => (
    <select id={`pp-${key}`} style={{ ...s.input, ...(errors[key] ? s.bad : {}) }} value={form[key]} onChange={set(key)}>
      <option value="">Choose…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  const check = (key, text) => (
    <div style={{ marginBottom: 10 }}>
      <label style={s.check}>
        <input type="checkbox" checked={form[key]} onChange={set(key)} style={{ marginTop: 3, width: 18, height: 18, accentColor: "#15803d", flexShrink: 0 }} />
        <span>{text}</span>
      </label>
      {errors[key] && <p role="alert" style={s.err}>{errors[key]}</p>}
    </div>
  );

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Rehome a pet</h1>
      <p style={s.lead}>Can't keep your pet? List them here so a caring adopter can find them. Every listing is reviewed before it goes live.</p>

      {!user.emailVerified && (
        <div style={s.warn}>Verify your email before posting. <Link to="/profile?tab=verification">Verify now</Link></div>
      )}
      {notice && <div role="status" style={s.ok}>{notice}</div>}
      {error && <div role="alert" style={s.fail}>{error}</div>}

      <form onSubmit={submit} noValidate style={s.card}>
        <div style={s.row}>
          {field("name", "Pet's name", input("name", { maxLength: 40 }))}
          {field("type", "Type", select("type", TYPES))}
        </div>
        <div style={s.row}>
          {field("breed", "Breed (optional)", input("breed", { maxLength: 40 }))}
          {field("city", "City or area", input("city", { maxLength: 60, placeholder: "e.g. Mandaue, Cebu" }))}
        </div>
        <div style={s.row}>
          {field("age", "Age group", select("age", AGES))}
          {field("gender", "Gender", select("gender", GENDERS))}
        </div>

        {field("description", "About the pet", <textarea id="pp-description" rows={4} maxLength={800} style={{ ...s.input, ...(errors.description ? s.bad : {}) }} value={form.description} onChange={set("description")} />, "Personality, habits, how they are with kids and other pets.")}
        {field("reason", "Why are you rehoming?", <textarea id="pp-reason" rows={2} maxLength={400} style={{ ...s.input, ...(errors.reason ? s.bad : {}) }} value={form.reason} onChange={set("reason")} />, "Adopters and our review team will see this.")}

        <div style={{ marginBottom: 14 }}>
          {check("vaccinated", "Vaccinated")}
          {check("neutered", "Spayed or neutered")}
        </div>

        <div style={s.field}>
          <label htmlFor="pp-photos" style={s.label}>Photos (1 to {MAX_PHOTOS})</label>
          <input id="pp-photos" type="file" accept={PET_PHOTO_TYPES.join(",")} multiple onChange={addFiles} disabled={files.length >= MAX_PHOTOS} />
          {errors.photos && <p role="alert" style={s.err}>{errors.photos}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            {previews.map((src, i) => (
              <div key={src} style={{ position: "relative" }}>
                <img src={src} alt={`Pet photo ${i + 1}`} style={s.thumb} />
                <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} style={s.thumbX}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div style={s.promises}>
          {check("ownsPet", "This is my pet, and I have the right to rehome them.")}
          {check("noSale", "I'm not selling this pet. I won't ask for money to hold or deliver them.")}
          {check("safeMeet", "I'll meet adopters in a safe, public place and screen them before handing over my pet.")}
        </div>

        <button type="submit" disabled={submitting} style={{ ...s.primary, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </form>

      <h2 style={s.h2}>My listings</h2>
      {listings.length === 0 && <p style={s.hint}>You haven't posted any pets yet.</p>}
      {listings.map((p) => {
        const st = STATUS[p.status] || STATUS["Pending Review"];
        return (
          <div key={p.id} style={s.listing}>
            {p.photoUrl && <img src={p.photoUrl} alt="" style={s.listImg} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong>{p.name}</strong>
                <span style={{ ...s.chip, background: st.bg, color: st.fg }}>{st.label}</span>
              </div>
              <div style={s.hint}>{[p.type, p.breed, p.age, p.city].filter(Boolean).join(" · ")}</div>
              {p.status === "Rejected" && p.reviewNote && <p style={s.err}>Reason: {p.reviewNote}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {p.status === "Available" && <button type="button" style={s.secondary} disabled={busyId === p.id} onClick={() => markAdopted(p)}>Mark as adopted</button>}
                <button type="button" style={s.danger} disabled={busyId === p.id} onClick={() => remove(p)}>Remove</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const s = {
  page: { maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px", color: "#0f172a" },
  h1: { margin: "0 0 6px", fontSize: "1.8rem" },
  h2: { margin: "36px 0 12px", fontSize: "1.3rem" },
  lead: { margin: "0 0 18px", color: "#475569" },
  card: { padding: 22, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 4px 16px rgba(15,23,42,.06)" },
  row: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", fontSize: 15, border: "1px solid #cbd5e1", borderRadius: 10, boxSizing: "border-box", fontFamily: "inherit", background: "#fff" },
  bad: { borderColor: "#dc2626" },
  hint: { margin: "4px 0 0", fontSize: 12, color: "#64748b" },
  err: { margin: "4px 0 0", fontSize: 12, color: "#b91c1c", fontWeight: 600 },
  check: { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.4, cursor: "pointer" },
  promises: { padding: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, margin: "6px 0 16px" },
  thumb: { width: 96, height: 96, objectFit: "cover", borderRadius: 10, display: "block" },
  thumbX: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: 11 },
  primary: { padding: "12px 26px", background: "#15803d", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer" },
  secondary: { padding: "7px 16px", border: "2px solid #15803d", borderRadius: 8, background: "#fff", color: "#15803d", fontWeight: 700, cursor: "pointer" },
  danger: { padding: "7px 16px", border: "2px solid #b91c1c", borderRadius: 8, background: "#fff", color: "#b91c1c", fontWeight: 700, cursor: "pointer" },
  chip: { padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  listing: { display: "flex", gap: 14, padding: 14, marginBottom: 10, border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff" },
  listImg: { width: 84, height: 84, objectFit: "cover", borderRadius: 10, flexShrink: 0 },
  warn: { padding: "10px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", marginBottom: 14, fontSize: 14 },
  ok: { padding: "10px 14px", borderRadius: 10, background: "#d1fae5", color: "#065f46", marginBottom: 14, fontSize: 14 },
  fail: { padding: "10px 14px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", marginBottom: 14, fontSize: 14 },
};
