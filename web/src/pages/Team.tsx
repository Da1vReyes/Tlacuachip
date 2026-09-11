import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { providers } from "../data/mockData";
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
  const { businessForm, preferences, steps, team, toggleTeamProvider } = useApp();
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const inTeam = team.includes(p.id);
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
          </div>
        </div>
        <p>{p.description}</p>
        <p className="team-reason">Por qué: {rec.reason}</p>
        <button className={`btn ${inTeam ? "btn-secondary" : "btn-primary"}`} onClick={() => toggleTeamProvider(p.id)}>
          {inTeam ? "Quitar de mi equipo" : "Guardar en mi equipo"}
        </button>
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

      {team.length > 0 && (
        <div className="card stack" style={{ gap: 6 }}>
          <h2>Mi equipo ({team.length})</h2>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {team.map((id) => byId.get(id)?.name).filter(Boolean).join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}
