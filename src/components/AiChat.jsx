// FILE: src/components/AiChat.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { auth } from "../firebase";

const DEFAULT_SUGGESTIONS = [
  "How do I adopt a pet here?",
  "What should I ask at a shelter visit?",
  "How do I book a vet?",
];

/**
 * Floating AI assistant. Props are its parameters:
 *   user         the logged-in user (the app already passes this)
 *   context      extra info for better answers, e.g. { petName: "Bella" }
 *   endpoint     where the server function lives (default /api/chat)
 *   title        header text
 *   suggestions  quick-start questions
 *   maxHistory   how many recent messages are sent along (default 10)
 */
export default function AiChat({
  user,
  context = {},
  endpoint = import.meta.env?.VITE_CHAT_API_URL || "/api/chat",
  title = "VetAdopt Assistant",
  suggestions = DEFAULT_SUGGESTIONS,
  maxHistory = 10,
}) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) return null; // the server only answers logged-in users

  const send = async (question) => {
    const q = (question ?? text).trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user", text: q }];
    setMessages(next);
    setText("");
    setError("");
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: next.slice(-maxHistory),
          context: { page: pathname, role: String(user.role || "adopter").toLowerCase(), ...context },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages([...next, { role: "assistant", text: data.reply }]);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    }
    setBusy(false);
  };

  return (
    <>
      <style>{CSS}</style>
      {!open && (
        <button type="button" className="ai-fab" onClick={() => setOpen(true)} aria-label="Open the assistant">
          💬
        </button>
      )}

      {open && (
        <section className="ai-panel" role="dialog" aria-label={title}>
          <header className="ai-head">
            <strong>🐾 {title}</strong>
            <span>
              {messages.length > 0 && (
                <button type="button" className="ai-link" onClick={() => { setMessages([]); setError(""); }}>Clear</button>
              )}
              <button type="button" className="ai-x" onClick={() => setOpen(false)} aria-label="Close the assistant">✕</button>
            </span>
          </header>

          <div className="ai-body" role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className="ai-intro">
                <p>Hi! Ask me about adopting, vets, donations or how to use the site.</p>
                <div className="ai-chips">
                  {suggestions.map((s) => (
                    <button key={s} type="button" className="ai-chip" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>{m.text}</div>
            ))}
            {busy && <div className="ai-msg assistant ai-typing" aria-label="The assistant is typing">…</div>}
            {error && <p role="alert" className="ai-error">{error}</p>}
            <div ref={endRef} />
          </div>

          <p className="ai-note">AI can make mistakes and isn't a vet. Don't share personal details. For emergencies, call a vet right away.</p>

          <div className="ai-compose">
            <textarea
              ref={inputRef}
              rows={1}
              maxLength={600}
              aria-label="Ask the assistant"
              placeholder="Type your question…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button type="button" className="ai-send" onClick={() => send()} disabled={busy || !text.trim()}>Send</button>
          </div>
        </section>
      )}
    </>
  );
}

const CSS = `
.ai-fab { position: fixed; right: 20px; bottom: 20px; z-index: 900; width: 58px; height: 58px; border: none; border-radius: 50%; background: linear-gradient(135deg,#0d6b6e,#0b5457); color: #fff; font-size: 26px; cursor: pointer; box-shadow: 0 8px 24px rgba(13,107,110,.45); }
.ai-fab:focus-visible, .ai-send:focus-visible, .ai-chip:focus-visible, .ai-x:focus-visible, .ai-link:focus-visible { outline: 3px solid #19a3a1; outline-offset: 2px; }
.ai-panel { position: fixed; right: 20px; bottom: 20px; z-index: 900; display: flex; flex-direction: column; width: min(380px, calc(100vw - 24px)); height: min(560px, calc(100dvh - 40px)); background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 16px 48px rgba(15,23,42,.25); overflow: hidden; color: #0f172a; font-family: inherit; }
.ai-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: linear-gradient(135deg,#0d6b6e,#0b5457); color: #fff; }
.ai-x, .ai-link { background: none; border: none; color: #fff; cursor: pointer; font: inherit; }
.ai-link { margin-right: 12px; text-decoration: underline; font-size: .85rem; }
.ai-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; background: #f8fafc; }
.ai-intro p { margin: 0 0 10px; color: #475569; font-size: .92rem; }
.ai-chips { display: flex; flex-direction: column; gap: 8px; }
.ai-chip { text-align: left; padding: 9px 12px; border: 1px solid #b8e6e3; border-radius: 12px; background: #ecf9f8; color: #0b5457; font: inherit; font-size: .88rem; cursor: pointer; }
.ai-msg { max-width: 85%; padding: 9px 13px; border-radius: 16px; font-size: .92rem; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
.ai-msg.user { align-self: flex-end; background: #0d6b6e; color: #fff; border-bottom-right-radius: 5px; }
.ai-msg.assistant { align-self: flex-start; background: #fff; border: 1px solid #e2e8f0; border-bottom-left-radius: 5px; }
.ai-typing { letter-spacing: 3px; color: #64748b; }
.ai-error { margin: 4px 0 0; padding: 8px 12px; border-radius: 10px; background: #fee2e2; color: #b91c1c; font-size: .85rem; }
.ai-note { margin: 0; padding: 6px 14px; font-size: .7rem; color: #64748b; background: #fffbeb; border-top: 1px solid #fde68a; }
.ai-compose { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid #e2e8f0; }
.ai-compose textarea { flex: 1; resize: none; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 14px; font: inherit; max-height: 90px; }
.ai-send { padding: 0 16px; border: none; border-radius: 14px; background: #0d6b6e; color: #fff; font-weight: 700; cursor: pointer; }
.ai-send:disabled { opacity: .5; cursor: not-allowed; }
`;