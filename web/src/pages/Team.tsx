import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import type { Workspace } from "../lib/userApi";
import { getAiStatus, postJson, type AiStatus } from "../lib/api";
import { buildMinimizedProfile, describeMinimizedProfile, NEVER_SHARED } from "../lib/privacy";
import { providerKindLabel, rankProviders, toRecommendations } from "../lib/matching";
import { IconCheck, IconLock } from "../components/icons";
import type { Provider, TeamRecommendation } from "../types";

interface MatchResponse {
  source: "llm" | "fallback";
  model: string | null;
  recommendations: TeamRecommendation[];
  summary?: string;
}

export default function Team() {
  const navigate = useNavigate();
  const { businessForm, preferences, steps, catalogProviders: providers, getWorkspace, completeWorkspaceItem } = useApp();
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace[]>([]);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  useEffect(() => {
    if (!businessForm) navigate("/formulario", { replace: true });
  }, [businessForm, navigate]);

  useEffect(() => {
    let cancelled = false;
    getAiStatus().then((s) => {
      if (!cancelled) setAiStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadWorkspace = async () => {
    try {
      setWorkspaceError(null);
      setWorkspace(await getWorkspace());
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : "No se pudo cargar tu equipo.");
    }
  };

  useEffect(() => { void loadWorkspace(); }, []); // authenticated AppContext supplies the current token

  const profile = useMemo(
    () => (businessForm ? buildMinimizedProfile(businessForm, preferences, steps) : null),
    [businessForm, preferences, steps]
  );

  const localRecommendations = useMemo(
    () => (profile ? toRecommendations(rankProviders(profile, providers, steps)) : []),
    [profile, steps]
  );

  if (!businessForm || !profile) return null;

  const nextStep = steps.find((s) => s.id === profile.nextStepId);
  const byId = new Map(providers.map((p) => [p.id, p]));
  const recommendations = result?.recommendations ?? localRecommendations;
  const forNext = recommendations.filter((r) => nextStep && r.forStepId === nextStep.id);
  const later = recommendations.filter((r) => !(nextStep && r.forStepId === nextStep.id));

  const askAi = async () => {
    setLoading(true);
    setError(null);
    try {
      const candidates = rankProviders(profile, providers, steps)
        .slice(0, 8)
        .map(({ provider }) => ({
          id: provider.id,
          name: provider.name,
          kind: provider.kind,
          isAI: Boolean(provider.isAI),
          city: provider.city,
          rating: provider.rating,
          description: provider.description,
          helpsWith: provider.helpsWith,
        }));
      const steps_ = steps.map((s) => ({ id: s.id, title: s.title, status: s.status }));
      const res = await postJson<MatchResponse>("/api/match", { profile, candidates, steps: steps_ });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar la IA");
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (rec: TeamRecommendation) => {
    const p = byId.get(rec.providerId) as Provider | undefined;
    if (!p) return null;
    return (
      <div key={p.id} className="card stack" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div className="stack" style={{ gap: 2 }}>
            <strong style={{ fontSize: 14 }}>{p.name}</strong>
            <span className="muted">{p.location} · ★ {p.rating}</span>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span className="pill">{providerKindLabel[p.kind]}</span>
            {p.isAI && <span className="pill pill-warn">Agente de IA</span>}
            {p.isDemo && <span className="pill">Perfil demo</span>}
          </div>
        </div>
        <p>{p.description}</p>
        <p className="team-reason">Por qué: {rec.reason}</p>
        <button className="btn btn-primary" onClick={() => navigate("/marketplace")}>Hablar primero</button>
      </div>
    );
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 4 }}>
        <h1>Tu equipo recomendado</h1>
        <p>Profesionales y proveedores que se registraron para ser encontrados, ordenados por lo que necesitas ahora{nextStep ? `: ${nextStep.title}` : ""}.</p>
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="stack" style={{ gap: 2 }}>
            <h2>Lo que la IA verá</h2>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Se envía solo esto, según tu configuración de privacidad ({preferences.visibility === "private" ? "privado" : preferences.visibility === "business" ? "datos clave" : "perfil completo"}).
            </span>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowPayload((v) => !v)}>{showPayload ? "Ocultar" : "Ver exactamente qué se envía"}</button>
        </div>
        {showPayload && (
          <div className="stack" style={{ gap: 12 }}>
            <dl className="payload-list">
              {describeMinimizedProfile(profile).map((row) => (
                <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
              ))}
            </dl>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "var(--secondaryText)", display: "inline-flex" }}><IconLock size={14} /></span>
              <span className="muted" style={{ fontSize: 12.5 }}>Nunca se envía: {NEVER_SHARED.join(", ")}.</span>
              <button className="btn btn-ghost" style={{ padding: 0, fontSize: 12.5 }} onClick={() => navigate("/configuracion")}>Cambiar en Configuración</button>
            </div>
          </div>
        )}
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={askAi} disabled={loading || aiStatus === null || !aiStatus.configured}>
            {loading ? "Consultando…" : "Recomendar con IA"}
          </button>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {aiStatus === null
              ? "Verificando disponibilidad de la IA…"
              : aiStatus.configured
                ? `Modelo: ${aiStatus.model}`
                : "IA no configurada en el servidor. Mientras tanto ves el ranking local (mismas reglas, sin modelo)."}
          </span>
        </div>
        {error && <span className="muted" style={{ color: "var(--warn)", fontSize: 12.5 }}>La IA no respondió ({error}). Mostramos el ranking local.</span>}
        {result && (
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <span style={{ color: "var(--success)", display: "inline-flex" }}><IconCheck size={14} /></span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {result.source === "llm" ? `Recomendación generada con IA (${result.model}).` : "El servidor respondió con el ranking local."}
              {result.summary ? ` ${result.summary}` : ""}
            </span>
          </div>
        )}
      </div>

      {forNext.length > 0 && (
        <div className="stack" style={{ gap: 10 }}>
          <h2>Para tu siguiente paso{nextStep ? `: ${nextStep.title}` : ""}</h2>
          <div className="grid-2">{forNext.map(renderCard)}</div>
        </div>
      )}

      {later.length > 0 && (
        <div className="stack" style={{ gap: 10 }}>
          <h2>Más adelante en tu ruta</h2>
          <div className="grid-2">{later.map(renderCard)}</div>
        </div>
      )}

      <section className="stack" style={{ gap: 10 }}>
        <div className="stack" style={{ gap: 2 }}>
          <h2>Equipo activo</h2>
          <p className="muted" style={{ fontSize: 13 }}>Un perfil no se añade aquí automáticamente: primero hablan, ambos aceptan colaborar y entonces el trabajo queda centralizado.</p>
        </div>
        {workspaceError && <p className="muted" style={{ color: "var(--warn)", fontSize: 13 }}>{workspaceError}</p>}
        {workspace.length === 0 ? <div className="card"><p className="muted">Aún no tienes una colaboración activa. Después de aceptar una conversación, envía una invitación desde Mensajes.</p></div> : <div className="grid-2">{workspace.map((space) => (
          <article className="card stack" style={{ gap: 12 }} key={space.conversationId}>
            <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
              <div className="stack" style={{ gap: 2 }}><h3>{space.collaborator.name}</h3><span className="muted" style={{ fontSize: 12 }}>{space.collaborator.role === "provider" ? "Profesional en tu negocio" : "Emprendedor/a"}</span></div>
              <span className="pill pill-success">Activo</span>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <strong style={{ fontSize: 13 }}>Plan y pendientes</strong>
              {space.tasks.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>Tu profesional todavía no agregó tareas.</p> : space.tasks.map((task) => <label className="row" style={{ alignItems: "flex-start", gap: 8 }} key={task.id}>
                <input type="checkbox" checked={task.completed} disabled={updatingTask === task.id} onChange={async (event) => { setUpdatingTask(task.id); try { await completeWorkspaceItem(task.id, event.target.checked); await loadWorkspace(); } finally { setUpdatingTask(null); } }} />
                <span className="stack" style={{ gap: 2 }}><strong style={{ fontSize: 13, textDecoration: task.completed ? "line-through" : undefined }}>{task.title}</strong>{task.description && <span className="muted" style={{ fontSize: 12 }}>{task.description}</span>}{task.dueDate && <span className="muted" style={{ fontSize: 12 }}>Fecha: {task.dueDate}</span>}</span>
              </label>)}
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <strong style={{ fontSize: 13 }}>Entregables</strong>
              {space.files.length === 0 ? <span className="muted" style={{ fontSize: 13 }}>Sin archivos todavía.</span> : space.files.map((file) => <a className="btn btn-secondary" style={{ width: "fit-content" }} key={file.id} href={file.dataUrl} download={file.name}>Descargar {file.name}</a>)}
            </div>
          </article>
        ))}</div>}
      </section>
    </div>
  );
}
