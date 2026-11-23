// FILE: src/components/ScreeningSummary.jsx
import { evaluateScreening, labelOf } from "../utils/screening";

const TONES = {
  concern: { bg: "#fef2f2", border: "#fca5a5", fg: "#991b1b" },
  review: { bg: "#fffbeb", border: "#fcd34d", fg: "#92400e" },
  ready: { bg: "#ecf9f8", border: "#8fdcd8", fg: "#0b5457" },
};
const FLAG_ICON = { high: "⚠️", medium: "💬", info: "ℹ️" };

/**
 * For shelters reviewing an application:
 *   <ScreeningSummary screening={app.screening} petType={app.petType} />
 * Renders nothing for older applications that have no screening answers.
 */
export default function ScreeningSummary({ screening, petType }) {
  const result = evaluateScreening(screening, petType);
  if (!result) return null;
  const tone = TONES[result.level];

  return (
    <section
      aria-label="Adopter readiness"
      style={{ border: `1px solid ${tone.border}`, background: tone.bg, borderRadius: 12, padding: 14, margin: "12px 0", fontSize: 14 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ color: tone.fg }}>
          {result.icon} {result.label}
        </strong>
        <span style={{ fontSize: 12, color: "#64748b" }}>Based on the applicant's own answers</span>
      </div>

      {result.flags.length > 0 && (
        <ul style={{ margin: "10px 0 0", paddingLeft: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {result.flags.map((f) => (
            <li key={f.text}>
              <span aria-hidden="true">{FLAG_ICON[f.severity]} </span>
              {f.text}
            </li>
          ))}
        </ul>
      )}

      {result.strengths.length > 0 && (
        <p style={{ margin: "10px 0 0", color: "#0b5457" }}>
          <strong>Good signs: </strong>
          {result.strengths.join(" · ")}
        </p>
      )}

      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: "pointer", color: "#334155" }}>All answers</summary>
        <dl style={{ margin: "8px 0 0", display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px" }}>
          {[
            ["Housing", labelOf("housing", screening.housing)],
            screening.landlord && ["Landlord", labelOf("landlord", screening.landlord)],
            ["Household agrees", labelOf("householdAgrees", screening.householdAgrees)],
            ["Time alone", labelOf("hoursAlone", screening.hoursAlone)],
            ["Where the pet stays", labelOf("petStays", screening.petStays)],
            ["Experience", labelOf("experience", screening.experience)],
            ["Vet costs covered", labelOf("vetCosts", screening.vetCosts)],
            ["Previous pets", labelOf("previousPets", screening.previousPets)],
            screening.previousPetsNote && ["What happened", screening.previousPetsNote],
            screening.vetReference && ["Vet reference", screening.vetReference],
          ]
            .filter(Boolean)
            .map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt style={{ color: "#64748b" }}>{k}</dt>
                <dd style={{ margin: 0 }}>{v}</dd>
              </div>
            ))}
        </dl>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
          The applicant agreed to follow-up check-ins, to return the pet to you instead of rehoming it, and to provide proper care.
        </p>
      </details>

      <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
        This is a guide, not a decision. Confirm with a phone call, the vet reference or a home visit.
      </p>
    </section>
  );
}