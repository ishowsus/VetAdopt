import { useNavigate } from "react-router-dom";

/**
 * Drop-in "Message" button. Opens /messages with the other person (and the pet) preselected.
 *   toUid         uid of the shelter / vet to message
 *   me            current Firebase user (or null)
 *   onRequireAuth called when logged out (open your login modal)
 */
export default function MessageButton({ toUid, me, petId, petName, onRequireAuth, children = "💬 Message" }) {
  const navigate = useNavigate();
  if (!toUid || me?.uid === toUid) return null;

  const go = (e) => {
    e.stopPropagation();
    if (!me) {
      onRequireAuth?.();
      return;
    }
    const p = new URLSearchParams({ with: toUid });
    if (petId) p.set("pet", petId);
    if (petName) p.set("petName", petName);
    navigate(`/messages?${p.toString()}`);
  };

  return (
    <button
      type="button"
      onClick={go}
      style={{
        marginLeft: "auto",
        padding: "6px 14px",
        border: "2px solid #16a34a",
        borderRadius: 999,
        background: "#fff",
        color: "#15803d",
        fontWeight: 700,
        fontSize: "0.8rem",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}