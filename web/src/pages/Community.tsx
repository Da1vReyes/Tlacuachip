import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { fetchCommunityPosts, type CommunityPost } from "../lib/userApi";
import { IconLock } from "../components/icons";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function Community() {
  const navigate = useNavigate();
  const { progress, publishCommunityPost } = useApp();
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Freeze "now" for this render pass so the active/inactive check stays
  // consistent even if the component re-renders multiple times.
  const now = useMemo(() => Date.now(), []);
  const msSinceActive = now - new Date(progress.lastActiveAt).getTime();
  const daysSinceActive = msSinceActive / (24 * 60 * 60 * 1000);
  const isActive = msSinceActive < THIRTY_DAYS_MS;

  useEffect(() => {
    fetchCommunityPosts().then(setPosts).catch(() => setError("No pudimos cargar la comunidad. Intenta actualizar."));
  }, []);

  const publish = async () => {
    if (!draft.trim()) return;
    setSending(true); setError(null);
    try {
      const post = await publishCommunityPost(draft, replyTo ?? undefined);
      setPosts((current) => [post, ...current]);
      setDraft(""); setReplyTo(null);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo publicar."); }
    finally { setSending(false); }
  };

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
          <p>Conversaciones reales entre personas que siguen activas en su camino. Tú decides qué comparte tu perfil.</p>
        </div>

        <div className="stack">
          {posts.length === 0 && !error && <div className="card stack" style={{ gap: 6 }}><strong>Aún no hay publicaciones.</strong><p>Inicia la conversación con una duda concreta sobre tu siguiente paso.</p></div>}
          {posts.map((m) => (
            <div key={m.id} className="card stack" style={{ gap: 6 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.author}</span>
                <span className="muted">{new Intl.RelativeTimeFormat("es", { numeric: "auto" }).format(Math.round((new Date(m.createdAt).getTime() - Date.now()) / 86_400_000), "day")}</span>
              </div>
              <span className="muted">
                {m.businessType} · {m.location}
              </span>
              <p style={{ color: "var(--primaryText)" }}>{m.body}</p>
              {!m.parentId && <button className="btn btn-ghost" style={{ padding: 0, alignSelf: "flex-start" }} onClick={() => setReplyTo(m.id)}>Responder</button>}
            </div>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h2>{replyTo ? "Responde a la publicación" : "Comparte algo"}</h2>
        <div className="field">
          <textarea rows={4} maxLength={1200} placeholder={replyTo ? "Escribe una respuesta útil…" : "Comparte una duda, avance o aprendizaje…"} value={draft} onChange={(event) => setDraft(event.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={!draft.trim() || sending} onClick={publish}>{sending ? "Publicando…" : replyTo ? "Responder" : "Publicar"}</button>
        {replyTo && <button className="btn btn-ghost" onClick={() => setReplyTo(null)}>Cancelar respuesta</button>}
        {error && <p className="muted" style={{ color: "var(--warn)" }} role="status">{error}</p>}
      </div>
    </div>
  );
}
