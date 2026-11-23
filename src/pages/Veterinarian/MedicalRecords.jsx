// FILE: src/pages/Veterinarian/MedicalRecords.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useVetAppointments, buildPatients } from "./vetHelpers";

const TYPES = ["Checkup", "Vaccination", "Treatment", "Surgery", "Dental", "Lab test", "Other"];
const today = () => new Date().toISOString().split("T")[0];
const EMPTY = {
  patientKey: "", petName: "", type: "Checkup", date: "", diagnosis: "", treatment: "",
  medication: "", weight: "", vaccines: "", followUp: "", notes: "",
};
const t = (v, n = 500) => String(v || "").trim().slice(0, n);

function MedicalRecords() {
  const { appointments, user } = useVetAppointments();
  const uid = user?.uid || auth.currentUser?.uid;
  const [params, setParams] = useSearchParams();

  const patients = useMemo(() => buildPatients(appointments || []), [appointments]);
  const focusKey = params.get("patient") || "";
  const focusPatient = patients.find((p) => p.key === focusKey) || null;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [vetName, setVetName] = useState("");
  const [editing, setEditing] = useState(null); // "new" or a record
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // A vet can only read their own records (the rules require the query to say so).
  const loadRecords = async () => {
    if (!uid) return;
    try {
      const [a, b] = await Promise.all([
        getDocs(query(collection(db, "medicalRecords"), where("vetId", "==", uid))),
        getDocs(query(collection(db, "medicalRecords"), where("postedBy", "==", uid))),
      ]);
      const map = new Map();
      [...a.docs, ...b.docs].forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
      setRecords([...map.values()].sort((x, y) => (y.date || "").localeCompare(x.date || "")));
      setError("");
    } catch (err) {
      console.error(err);
      setError("Couldn't load your records. Make sure the latest Firestore rules are published.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!uid) return;
    loadRecords();
    getDoc(doc(db, "users", uid))
      .then((s) => s.exists() && setVetName(s.data().clinicName || s.data().name || auth.currentUser?.displayName || "Your vet"))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const openNew = () => {
    setForm({ ...EMPTY, date: today(), patientKey: focusPatient?.key || "", petName: focusPatient?.name || "" });
    setFormErrors({});
    setEditing("new");
  };
  const openEdit = (r) => {
    setForm({
      patientKey: "", petName: r.petName || "", type: r.type || "Checkup", date: r.date || today(),
      diagnosis: r.diagnosis || "", treatment: r.treatment || "", medication: r.medication || "",
      weight: r.weight ?? "", vaccines: r.vaccines || "", followUp: r.followUp || "", notes: r.notes || "",
    });
    setFormErrors({});
    setEditing(r);
  };

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "patientKey") next.petName = patients.find((p) => p.key === v)?.name || (v ? f.petName : "");
      return next;
    });
    setFormErrors((er) => ({ ...er, [k]: "" }));
  };

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!t(form.petName, 60)) errs.petName = "Choose a patient or type the pet's name.";
    if (!form.date) errs.date = "Choose the date.";
    if (![form.diagnosis, form.treatment, form.medication, form.vaccines, form.notes].some((x) => t(x))) errs.diagnosis = "Add at least a diagnosis, treatment, medication, vaccine or note.";
    if (form.weight !== "" && !(Number(form.weight) > 0 && Number(form.weight) < 200)) errs.weight = "Enter the weight in kg.";
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setError("");
    const fields = {
      type: form.type,
      date: form.date,
      diagnosis: t(form.diagnosis),
      treatment: t(form.treatment),
      medication: t(form.medication),
      vaccines: t(form.vaccines),
      followUp: form.followUp || "",
      notes: t(form.notes, 1000),
      weight: form.weight === "" ? null : Number(form.weight),
    };
    try {
      if (editing === "new") {
        const patient = patients.find((p) => p.key === form.patientKey);
        const ref = doc(collection(db, "medicalRecords"));
        const batch = writeBatch(db);
        batch.set(ref, {
          ...fields,
          petName: t(form.petName, 60),
          vetId: uid,
          postedBy: uid,
          vetName: vetName || "Your vet",
          ...(patient?.petId ? { petId: patient.petId } : {}),
          ...(patient?.userId ? { ownerId: patient.userId, ownerName: patient.ownerName || "" } : {}),
          createdAt: serverTimestamp(),
        });
        if (patient?.userId) {
          batch.set(doc(collection(db, "notifications")), {
            userId: patient.userId,
            text: `🩺 ${vetName || "Your vet"} added a medical record for ${t(form.petName, 60)}. See it in Profile, then Pet health.`,
            type: "record",
            createdAt: serverTimestamp(),
            read: false,
          });
        }
        await batch.commit();
      } else {
        await updateDoc(doc(db, "medicalRecords", editing.id), { ...fields, updatedAt: serverTimestamp() });
      }
      setEditing(null);
      await loadRecords();
    } catch (err) {
      console.error(err);
      setError("Couldn't save that record. Try again.");
    }
    setSaving(false);
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete the record for ${r.petName || "this pet"} on ${r.date || "this date"}?`)) return;
    try {
      await deleteDoc(doc(db, "medicalRecords", r.id));
      setRecords((list) => list.filter((x) => x.id !== r.id));
    } catch (err) {
      console.error(err);
      setError("Couldn't delete that record.");
    }
  };

  const visible = records.filter((r) => {
    if (focusPatient && !((r.petId && r.petId === focusPatient.petId) || (r.petName || "").toLowerCase() === focusPatient.name.toLowerCase())) return false;
    if (typeFilter !== "All" && (r.type || "Other") !== typeFilter) return false;
    const q = search.trim().toLowerCase();
    return !q || `${r.petName || ""} ${r.ownerName || ""} ${r.diagnosis || ""} ${r.medication || ""}`.toLowerCase().includes(q);
  });
  const dueSoon = records.filter((r) => r.followUp && r.followUp >= today()).length;

  if (loading) return <h2 style={{ textAlign: "center" }}>Loading...</h2>;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={{ margin: 0 }}>📋 Medical Records</h2>
          <p style={styles.count}>
            {records.length} record{records.length !== 1 ? "s" : ""}{dueSoon > 0 && ` · ${dueSoon} follow-up${dueSoon !== 1 ? "s" : ""} coming up`}
          </p>
        </div>
        <button type="button" style={styles.addBtn} onClick={openNew}>+ Add record</button>
      </div>

      {error && <div role="alert" style={styles.error}>{error}</div>}

      {focusPatient && (
        <div style={styles.focus}>
          Showing records for <strong>{focusPatient.name}</strong>
          <button type="button" style={styles.link} onClick={() => setParams({})}>Show all patients</button>
        </div>
      )}

      <div style={styles.filters}>
        <input style={styles.search} placeholder="Search by pet, owner or diagnosis..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search records" />
        <select style={styles.select} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
          {["All", ...TYPES].map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>

      {visible.length === 0 ? (
        <div style={styles.emptyState}>
          {records.length === 0 ? "No medical records yet. Add one after a visit." : "No records match."}
        </div>
      ) : (
        <div style={styles.list}>
          {visible.map((r) => {
            const overdue = r.followUp && r.followUp < today();
            return (
              <div key={r.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h4 style={styles.petName}>{r.petName || "Unknown Pet"}</h4>
                    {r.ownerName && <span style={styles.owner}>Owner: {r.ownerName}</span>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={styles.date}>{r.date || "No date"}</span>
                    <div><span style={styles.type}>{r.type || "Record"}</span></div>
                  </div>
                </div>

                {r.diagnosis && <Field label="Diagnosis" value={r.diagnosis} />}
                {r.treatment && <Field label="Treatment" value={r.treatment} />}
                {r.medication && <Field label="Medication" value={r.medication} />}
                {r.vaccines && <Field label="Vaccines" value={r.vaccines} />}
                {r.weight != null && r.weight !== "" && <Field label="Weight" value={`${r.weight} kg`} />}
                {r.notes && <Field label="Notes" value={r.notes} />}
                {r.followUp && (
                  <div style={{ ...styles.follow, ...(overdue ? styles.followLate : {}) }}>
                    🔔 Follow-up: {r.followUp}{overdue && " (past due)"}
                  </div>
                )}
                {!r.ownerId && <p style={styles.hint}>Not linked to an adopter, so only you can see it.</p>}

                <div style={styles.actions}>
                  <button type="button" style={styles.edit} onClick={() => openEdit(r)}>Edit</button>
                  <button type="button" style={styles.del} onClick={() => remove(r)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div style={styles.overlay} role="dialog" aria-modal="true" aria-label={editing === "new" ? "Add a medical record" : "Edit medical record"}>
          <form onSubmit={save} style={styles.modal} noValidate>
            <h3 style={{ margin: "0 0 14px" }}>{editing === "new" ? "Add a medical record" : "Edit record"}</h3>

            {editing === "new" ? (
              <>
                <label style={styles.label} htmlFor="mr-patient">Patient</label>
                <select id="mr-patient" style={styles.input} value={form.patientKey} onChange={set("patientKey")}>
                  <option value="">Other or walk-in (not linked to an adopter)</option>
                  {patients.map((p) => (
                    <option key={p.key} value={p.key}>{p.name}{p.ownerName ? ` (owner: ${p.ownerName})` : ""}</option>
                  ))}
                </select>
                {!form.patientKey && (
                  <>
                    <label style={styles.label} htmlFor="mr-pet">Pet's name*</label>
                    <input id="mr-pet" style={{ ...styles.input, ...(formErrors.petName ? styles.bad : {}) }} value={form.petName} onChange={set("petName")} maxLength={60} />
                  </>
                )}
                {formErrors.petName && <p style={styles.err}>{formErrors.petName}</p>}
                {form.patientKey && <p style={styles.hint}>The adopter will be notified and can see this record in their profile.</p>}
              </>
            ) : (
              <p style={styles.hint}>Pet: <strong>{form.petName}</strong></p>
            )}

            <div style={styles.two}>
              <div>
                <label style={styles.label} htmlFor="mr-type">Type</label>
                <select id="mr-type" style={styles.input} value={form.type} onChange={set("type")}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select>
              </div>
              <div>
                <label style={styles.label} htmlFor="mr-date">Date*</label>
                <input id="mr-date" type="date" style={{ ...styles.input, ...(formErrors.date ? styles.bad : {}) }} value={form.date} onChange={set("date")} />
              </div>
            </div>

            <label style={styles.label} htmlFor="mr-dx">Diagnosis</label>
            <input id="mr-dx" style={{ ...styles.input, ...(formErrors.diagnosis ? styles.bad : {}) }} value={form.diagnosis} onChange={set("diagnosis")} maxLength={500} />
            {formErrors.diagnosis && <p style={styles.err}>{formErrors.diagnosis}</p>}

            <label style={styles.label} htmlFor="mr-tx">Treatment</label>
            <input id="mr-tx" style={styles.input} value={form.treatment} onChange={set("treatment")} maxLength={500} />

            <label style={styles.label} htmlFor="mr-rx">Medication and dose</label>
            <input id="mr-rx" style={styles.input} value={form.medication} onChange={set("medication")} maxLength={500} />

            <label style={styles.label} htmlFor="mr-vac">Vaccines given</label>
            <input id="mr-vac" style={styles.input} value={form.vaccines} onChange={set("vaccines")} maxLength={500} placeholder="e.g. Rabies, 5-in-1" />

            <div style={styles.two}>
              <div>
                <label style={styles.label} htmlFor="mr-w">Weight (kg)</label>
                <input id="mr-w" type="number" step="0.1" min="0" style={{ ...styles.input, ...(formErrors.weight ? styles.bad : {}) }} value={form.weight} onChange={set("weight")} />
                {formErrors.weight && <p style={styles.err}>{formErrors.weight}</p>}
              </div>
              <div>
                <label style={styles.label} htmlFor="mr-fu">Follow-up date</label>
                <input id="mr-fu" type="date" style={styles.input} value={form.followUp} onChange={set("followUp")} />
              </div>
            </div>

            <label style={styles.label} htmlFor="mr-notes">Notes</label>
            <textarea id="mr-notes" rows={3} style={styles.input} value={form.notes} onChange={set("notes")} maxLength={1000} />

            <div style={styles.modalActions}>
              <button type="button" style={styles.cancel} onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
              <button type="submit" style={styles.save} disabled={saving}>{saving ? "Saving..." : "Save record"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>{label}:</span>
      <span style={styles.fieldValue}>{value}</span>
    </div>
  );
}

const styles = {
  container: { padding: "30px" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 6 },
  count: { color: "#607d8b", margin: "4px 0 16px" },
  addBtn: { background: "#0d6b6e", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 600, cursor: "pointer" },
  error: { background: "#fdecea", color: "#b3261e", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 14 },
  focus: { display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", background: "#ecf9f8", borderRadius: 10, marginBottom: 14, fontSize: 14 },
  link: { background: "none", border: "none", color: "#0d6b6e", textDecoration: "underline", cursor: "pointer", fontWeight: 600 },
  filters: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
  search: { flex: 1, minWidth: 220, maxWidth: 360, padding: "10px 14px", borderRadius: 10, border: "1px solid #cfd8dc", fontSize: 14, boxSizing: "border-box", outline: "none" },
  select: { padding: "10px 14px", borderRadius: 10, border: "1px solid #cfd8dc", fontSize: 14, background: "#fff" },
  emptyState: { padding: 40, textAlign: "center", color: "#90a4ae", background: "#f8f9fa", borderRadius: 10 },
  list: { display: "flex", flexDirection: "column", gap: 14 },
  card: { background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 4px 14px rgba(0,0,0,.06)", borderLeft: "5px solid #0d6b6e" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  petName: { margin: 0, fontSize: 16 },
  owner: { fontSize: 12, color: "#90a4ae" },
  date: { fontSize: 13, color: "#607d8b", fontWeight: 600 },
  type: { display: "inline-block", marginTop: 4, padding: "2px 10px", borderRadius: 999, background: "#d6f2f0", color: "#0d6b6e", fontSize: 12, fontWeight: 600 },
  field: { display: "flex", gap: 6, fontSize: 14, marginBottom: 6, color: "#455a64" },
  fieldLabel: { fontWeight: 600, color: "#0d6b6e" },
  fieldValue: { flex: 1 },
  follow: { marginTop: 8, padding: "6px 12px", borderRadius: 8, background: "#e3f2fd", color: "#1565c0", fontSize: 13, fontWeight: 600, display: "inline-block" },
  followLate: { background: "#fdecea", color: "#b3261e" },
  hint: { margin: "8px 0 0", fontSize: 12, color: "#90a4ae" },
  actions: { display: "flex", gap: 8, marginTop: 12 },
  edit: { padding: "6px 16px", border: "1px solid #0d6b6e", borderRadius: 6, background: "#fff", color: "#0d6b6e", fontWeight: 600, cursor: "pointer" },
  del: { padding: "6px 16px", border: "1px solid #b3261e", borderRadius: 6, background: "#fff", color: "#b3261e", fontWeight: 600, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal: { background: "#fff", padding: 24, borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#546e7a", margin: "10px 0 4px" },
  input: { width: "100%", padding: 10, borderRadius: 6, border: "1px solid #cfd8dc", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14, background: "#fff" },
  bad: { borderColor: "#b3261e" },
  err: { margin: "4px 0 0", fontSize: 12, color: "#b3261e" },
  two: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  modalActions: { display: "flex", gap: 10, marginTop: 18 },
  cancel: { flex: 1, padding: 10, background: "#eceff1", border: "none", borderRadius: 6, color: "#37474f", cursor: "pointer" },
  save: { flex: 1, padding: 10, background: "#0d6b6e", border: "none", borderRadius: 6, color: "#fff", fontWeight: 600, cursor: "pointer" },
};

export default MedicalRecords;