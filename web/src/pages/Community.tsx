import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { communityMessages } from "../data/mockData";
import { IconLock } from "../components/icons";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function Community() {
  const navigate = useNavigate();
  const { progress } = useApp();
  const [draft, setDraft] = useState("");
  const [published, setPublished] = useState(false);

  // Freeze "now" for this render pass so the active/inactive check stays
  // consistent even if the component re-renders multiple times.
  const now = useMemo(() => Date.now(), []);
  const msSinceActive = now - new Date(progress.lastActiveAt).getTime();
  const daysSinceActive = msSinceActive / (24 * 60 * 60 * 1000);
  const isActive = msSinceActive < THIRTY_DAYS_MS;

  if (!isActive) {
    return (
      <div className="card stack" style={{ maxWidth: 440, alignItems: "center", textAlign: "center", padding: 40, gap: 14 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--secondaryBg)",
            color: "var(--secondaryText)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconLock size={20} />
        </div>
        <h1>Comunidad bloqueada</h1>
        <p>
          Llevas {Math.floor(daysSinceActive)} días sin actividad. Completa un paso de tu roadmap
          para recuperar el acceso a la comunidad.
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/roadmap")}>
          Ir a mi roadmap
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="pill pill-success">Acceso activo</span>
          <h1>Comunidad</h1>
          <p>Emprendedores de toda Latinoamérica compartiendo su camino.</p>
        </div>

        <div className="stack">
          {communityMessages.map((m) => (
            <div key={m.id} className="card stack" style={{ gap: 6 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.author}</span>
                <span className="muted">{m.timestamp}</span>
              </div>
              <span className="muted">
                {m.businessType} · {m.location}
              </span>
              <p style={{ color: "var(--primaryText)" }}>{m.message}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h2>Comparte algo</h2>
        <div className="field">
          <textarea rows={4} placeholder="Comparte algo con la comunidad..." value={draft} onChange={(event) => { setDraft(event.target.value); setPublished(false); }} />
        </div>
        <button className="btn btn-primary" disabled={!draft.trim()} onClick={() => { setDraft(""); setPublished(true); }}>Publicar</button>
        {published && <p className="muted" role="status">Publicado en esta sesión del prototipo.</p>}
      </div>
    </div>
  );
}
