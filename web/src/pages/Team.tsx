import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import type { Workspace } from "../lib/userApi";
import { buildMinimizedProfile } from "../lib/privacy";
import { providerKindLabel, rankProviders, toRecommendations } from "../lib/matching";
import type { Provider, TeamRecommendation } from "../types";

export default function Team() {
  const navigate = useNavigate();
  const { businessForm, preferences, steps, catalogProviders: providers, getWorkspace, completeWorkspaceItem } = useApp();
  const [workspace, setWorkspace] = useState<Workspace[]>([]);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  useEffect(() => { if (!businessForm) navigate("/formulario", { replace: true }); }, [businessForm, navigate]);
  const loadWorkspace = async () => {
    try { setWorkspaceError(null); setWorkspace(await getWorkspace()); }
    catch (err) { setWorkspaceError(err instanceof Error ? err.message : "No se pudo cargar tu equipo."); }
  };
  useEffect(() => { void loadWorkspace(); }, []);

  const profile = useMemo(() => businessForm ? buildMinimizedProfile(businessForm, preferences, steps) : null, [businessForm, preferences, steps]);
  const recommendations = useMemo(() => profile ? toRecommendations(rankProviders(profile, providers, steps)) : [], [profile, providers, steps]);
  if (!businessForm || !profile) return null;

  const nextStep = steps.find((step) => step.id === profile.nextStepId);
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const forNextStep = recommendations.filter((item) => item.forStepId === nextStep?.id);
  const picks = (forNextStep.length ? forNextStep : recommendations).slice(0, 2);
  const renderPick = (recommendation: TeamRecommendation) => {
    const provider = providerById.get(recommendation.providerId) as Provider | undefined;
    if (!provider) return null;
    return <article className="card stack" style={{ gap: 8 }} key={provider.id}>
      <div className="stack" style={{ gap: 2 }}><strong>{provider.name}</strong><span className="muted" style={{ fontSize: 13 }}>{providerKindLabel[provider.kind]} · {provider.city}</span></div>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>{provider.description}</p>
      <button className="btn btn-secondary" onClick={() => navigate("/marketplace", { state: { contactProviderId: provider.id } })}>Ver y contactar</button>
    </article>;
  };

  return <div className="stack" style={{ gap: 24, maxWidth: 920 }}>
    <header className="stack" style={{ gap: 4 }}>
      <h1>Tu equipo</h1>
      <p>Encuentra ayuda cuando un paso la necesita. Habla primero; colaborar es decisión de ambos.</p>
    </header>

    <section className="card stack" style={{ gap: 12 }}>
      <div className="stack" style={{ gap: 3 }}>
        <span className="step-resource-kicker">Tu siguiente movimiento</span>
        <h2>{nextStep ? nextStep.title : "Sigue avanzando en tu ruta"}</h2>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>Estas son las dos personas más relevantes para este momento.</p>
      </div>
      {picks.length ? <div className="grid-2">{picks.map(renderPick)}</div> : <p className="muted">No hay una recomendación para este paso todavía.</p>}
      <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}><button className="btn btn-ghost" onClick={() => navigate("/marketplace")}>Explorar más ayuda</button><button className="btn btn-ghost" onClick={() => navigate("/configuracion")}>Revisar privacidad</button></div>
    </section>

    <section className="stack" style={{ gap: 10 }}>
      <div className="stack" style={{ gap: 2 }}><h2>Trabajo activo</h2><p className="muted" style={{ fontSize: 13 }}>Aquí aparecen las personas con quienes ya acordaste colaborar.</p></div>
      {workspaceError && <p className="muted" style={{ color: "var(--warn)", fontSize: 13 }}>{workspaceError}</p>}
      {workspace.length === 0 ? <div className="card row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}><span className="muted">Aún no tienes una colaboración activa.</span><button className="btn btn-secondary" onClick={() => navigate("/marketplace")}>Buscar ayuda</button></div> : workspace.map((space) => {
        const isExpanded = expandedWorkspace === space.conversationId;
        const openTasks = space.tasks.filter((task) => !task.completed).length;
        return <article className="card stack" style={{ gap: 12 }} key={space.conversationId}>
          <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><strong>{space.collaborator.name}</strong><p className="muted" style={{ fontSize: 13, margin: "3px 0 0" }}>{openTasks ? `${openTasks} pendiente${openTasks === 1 ? "" : "s"}` : "Sin pendientes por ahora"} · {space.files.length} archivo{space.files.length === 1 ? "" : "s"}</p></div><div className="row" style={{ gap: 8 }}><button className="btn btn-ghost" onClick={() => navigate("/mensajes")}>Mensaje</button><button className="btn btn-secondary" onClick={() => setExpandedWorkspace(isExpanded ? null : space.conversationId)}>{isExpanded ? "Ocultar" : "Ver trabajo"}</button></div></div>
          {isExpanded && <div className="stack" style={{ gap: 12, borderTop: "1px solid var(--mainBorder)", paddingTop: 12 }}><div className="stack" style={{ gap: 7 }}><strong style={{ fontSize: 13 }}>Pendientes</strong>{space.tasks.length === 0 ? <span className="muted" style={{ fontSize: 13 }}>No hay tareas asignadas.</span> : space.tasks.map((task) => <label className="row" style={{ alignItems: "flex-start", gap: 8 }} key={task.id}><input type="checkbox" checked={task.completed} disabled={updatingTask === task.id} onChange={async (event) => { setUpdatingTask(task.id); try { await completeWorkspaceItem(task.id, event.target.checked); await loadWorkspace(); } finally { setUpdatingTask(null); } }} /><span className="stack" style={{ gap: 2 }}><strong style={{ fontSize: 13, textDecoration: task.completed ? "line-through" : undefined }}>{task.title}</strong>{task.description && <span className="muted" style={{ fontSize: 12 }}>{task.description}</span>}</span></label>)}</div><div className="stack" style={{ gap: 7 }}><strong style={{ fontSize: 13 }}>Archivos</strong>{space.files.length === 0 ? <span className="muted" style={{ fontSize: 13 }}>Aún no hay archivos.</span> : space.files.map((file) => <a className="btn btn-ghost" style={{ width: "fit-content" }} key={file.id} href={file.dataUrl} download={file.name}>Descargar {file.name}</a>)}</div></div>}
        </article>;
      })}
    </section>
  </div>;
}
