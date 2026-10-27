import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { useUnreadCount } from "../utils/chat";

/**
 * Small red count bubble. Put it inside your "Messages" nav link:
 *   <Link to="/messages">Messages <UnreadBadge /></Link>
 * Renders nothing when there's nothing unread.
 */
export default function UnreadBadge() {
  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid || null)), []);
  const count = useUnreadCount(uid);
  if (!count) return null;
  return (
    <span
      aria-label={`${count} unread messages`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        marginLeft: 6,
        borderRadius: 9,
        background: "#dc2626",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}