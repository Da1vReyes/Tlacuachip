import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function Mentors() {
  const { mentors, catalogProviders, contactProvider } = useApp();
  const [contacting, setContacting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const send = async (providerId: string) => { try { await contactProvider(providerId, message); setNotice("Solicitud enviada. El mentor decidirá si abre el chat."); setContacting(null); setMessage(""); } catch (err) { setNotice(err instanceof Error ? err.message : "No se pudo enviar la solicitud."); } };
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 4 }}>
        <h1>Habla con alguien que ya recorrió este camino</h1>
        <p>Encuentra una perspectiva práctica antes de decidir tu siguiente paso.</p>
      </div>

      <div className="grid-2">
        {mentors.map((m) => (
          <div key={m.id} className="card row" style={{ alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: m.avatarColor,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {m.name.charAt(0)}
            </div>
            <div className="stack" style={{ gap: 2, flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
              <span className="muted">{m.expertise}</span>
              <span className="muted">{m.location}</span>
              {(() => { const provider = catalogProviders.find((p) => p.name === m.name); return provider && (contacting === m.id ? <div className="stack" style={{ gap: 7, marginTop: 8 }}><textarea rows={2} maxLength={1200} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="¿Qué te gustaría conversar?" /><div className="row" style={{ gap: 8 }}><button className="btn btn-primary" disabled={!message.trim()} onClick={() => send(provider.id)}>Solicitar conversación</button><button className="btn btn-ghost" onClick={() => setContacting(null)}>Cancelar</button></div></div> : <button className="btn btn-secondary" style={{ width: "fit-content", marginTop: 8 }} onClick={() => { setContacting(m.id); setNotice(null); }}>Hablar con mentor</button>); })()}
            </div>
          </div>
        ))}
      </div>
      {notice && <p className="muted" role="status">{notice}</p>}
    </div>
  );
}
