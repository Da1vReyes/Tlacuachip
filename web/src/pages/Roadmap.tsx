import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type ComponentType } from "react";
import { useApp } from "../context/AppContext";
import { IconCheck, IconLock, IconForm, IconUsers, IconChart, IconChat, IconBag, IconRoute } from "../components/icons";

const categoryIcon: Record<string, ComponentType<{ size?: number }>> = {
  legal: IconForm,
  mentoria: IconUsers,
  finanzas: IconChart,
  marketing: IconChat,
  operaciones: IconBag,
  escalamiento: IconRoute,
};

const categoryLabel: Record<string, string> = {
  legal: "Legal",
  mentoria: "Mentoría",
  finanzas: "Finanzas",
  marketing: "Marketing",
  operaciones: "Operaciones",
  escalamiento: "Escalamiento",
};

const nodeSize = 56;
const nodeGap = 210;
const labelBoxHeight = 112;
const stubGap = 14;
const laneHeight = stubGap + labelBoxHeight;
const centerY = laneHeight + nodeSize / 2;
const timelineHeight = centerY + laneHeight + nodeSize / 2;

export default function Roadmap() {
  const navigate = useNavigate();
  const location = useLocation();
  const { steps, progress, businessForm } = useApp();
  const completedStepId = (location.state as { completedStepId?: string } | null)?.completedStepId;
  const [celebrating, setCelebrating] = useState(Boolean(completedStepId));

  useEffect(() => {
    if (!completedStepId) return;
    const timer = window.setTimeout(() => setCelebrating(false), 1450);
    return () => window.clearTimeout(timer);
  }, [completedStepId]);

  const isMexico = businessForm?.location.country === "Mexico";
  const baseSteps = steps.filter((step) => step.detail.applicability === "base");
  const completedBaseSteps = baseSteps.filter((step) => step.status === "completed").length;

  const xpForNextLevel = progress.level * 400;
  const xpProgress = Math.min(100, Math.round((progress.xp % 400) / 4));
  const startX = 90;
  const timelineWidth = Math.max((steps.length - 1) * nodeGap + startX * 2, 720);

  if (!isMexico) {
    return (
      <div className="stack" style={{ gap: 20, maxWidth: 680 }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1>Ruta de formalización</h1>
          <p>Por ahora, esta ruta regulatoria está diseñada solo para México. No te mostraremos requisitos legales de otro país como si fueran válidos para tu caso.</p>
        </div>
        <div className="card stack" style={{ gap: 12 }}>
          <h2>Tu análisis de zona sigue disponible</h2>
          <p>Explora oferta, demanda y costos mientras construimos una ruta regulatoria verificable para tu país.</p>
          <button className="btn btn-primary" onClick={() => navigate("/mapa-calor")}>Volver al mapa</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 4 }}>
        <h1>Tu camino para operar formalmente</h1>
        <p>Ruta de formalización para México. Cada paso pide evidencia; los requisitos especiales se revisan según giro y municipio.</p>
      </div>

      <div className="grid-3">
        <div className="card stack" style={{ gap: 5 }}>
          <span className="muted" style={{ fontSize: 12 }}>Base de formalización</span>
          <strong style={{ fontSize: 24 }}>{completedBaseSteps} de {baseSteps.length}</strong>
          <span className="muted" style={{ fontSize: 12 }}>pasos base con evidencia</span>
        </div>
        <div className="card stack" style={{ gap: 5 }}>
          <span className="muted" style={{ fontSize: 12 }}>Requisitos especiales</span>
          <strong style={{ fontSize: 15 }}>Se validan por giro</strong>
          <span className="muted" style={{ fontSize: 12 }}>sanitario, laboral y local</span>
        </div>
        <div className="card stack" style={{ gap: 5 }}>
          <span className="muted" style={{ fontSize: 12 }}>Criterio de avance</span>
          <strong style={{ fontSize: 15 }}>No sustituye una autoridad</strong>
          <span className="muted" style={{ fontSize: 12 }}>confirma siempre con fuentes oficiales</span>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto", overflowY: "hidden" }}>
        <div style={{ position: "relative", width: timelineWidth, height: timelineHeight, margin: "0 auto" }}>
          <svg width={timelineWidth} height={timelineHeight} style={{ position: "absolute", top: 0, left: 0 }}>
            <line
              x1={startX}
              y1={centerY}
              x2={timelineWidth - startX}
              y2={centerY}
              stroke="var(--mainBorder)"
              strokeWidth={6}
              strokeLinecap="round"
            />
            {(() => {
              const lastDone = steps.reduce((acc, s, i) => (s.status === "completed" ? i : acc), -1);
              if (lastDone < 0) return null;
              const doneX = startX + lastDone * nodeGap;
              return (
                <line
                  className={celebrating ? "roadmap-progress-draw" : undefined}
                  x1={startX}
                  y1={centerY}
                  x2={doneX}
                  y2={centerY}
                  stroke="var(--accentBlue)"
                  strokeWidth={6}
                  strokeLinecap="round"
                />
              );
            })()}
          </svg>

          {steps.map((step, i) => {
            const x = startX + i * nodeGap;
            const locked = step.status === "locked";
            const completed = step.status === "completed";
            const available = step.status === "available" || step.status === "in-progress";
            const isNewlyUnlocked = celebrating && i > 0 && steps[i - 1]?.id === completedStepId && available;
            const CatIcon = categoryIcon[step.category];
            const isAbove = i % 2 === 0;
            const connectMentor = step.detail.connectTo?.includes("mentores");
            const connectProvider = step.detail.connectTo?.includes("proveedores");

            return (
              <div key={step.id} style={{ position: "absolute", left: x - nodeSize / 2, top: centerY - nodeSize / 2 }}>
                {/* stub connector */}
                <div
                  style={{
                    position: "absolute",
                    left: nodeSize / 2 - 1,
                    top: isAbove ? -stubGap : nodeSize,
                    width: 2,
                    height: stubGap,
                    background: "var(--cardBorder)",
                  }}
                />

                <button
                  onClick={() => !locked && navigate(`/paso/${step.id}`)}
                  disabled={locked}
                  aria-label={step.title}
                  className={`${available ? "pulse-ring" : ""}${isNewlyUnlocked ? " roadmap-newly-unlocked" : ""}`}
                  style={{
                    width: nodeSize,
                    height: nodeSize,
                    borderRadius: "50%",
                    border: completed
                      ? "2.5px solid var(--accentBlue)"
                      : available
                      ? "2.5px solid var(--mainColor)"
                      : "2.5px solid var(--mainBorder)",
                    background: completed ? "var(--accentBlue)" : "#fff",
                    color: completed ? "#fff" : "var(--primaryText)",
                    cursor: locked ? "not-allowed" : "pointer",
                    opacity: locked ? 0.5 : 1,
                    boxShadow: "var(--cardShadow)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    animation: `popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  {completed ? <IconCheck size={19} /> : locked ? <IconLock size={16} /> : <CatIcon size={19} />}
                </button>

                <div
                  className="card"
                  style={{
                    position: "absolute",
                    top: isAbove ? -(stubGap + labelBoxHeight) : nodeSize + stubGap,
                    left: nodeSize / 2 - 82,
                    width: 164,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    opacity: locked ? 0.55 : 1,
                    animation: `fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both`,
                    animationDelay: `${i * 0.05 + 0.05}s`,
                  }}
                >
                  <span className="pill" style={{ background: "var(--navItemActiveBg)", fontSize: 10 }}>
                    {step.detail.applicability === "base" ? "Base" : step.detail.applicability === "conditional" ? "Según tu caso" : "Siguiente nivel"}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.25, color: "var(--primaryText)" }}>
                    {step.title}
                  </span>
                  <span className="muted" style={{ fontSize: 11 }}>+{step.xp} XP</span>
                  {(connectMentor || connectProvider) && (
                    <div className="row" style={{ gap: 6, marginTop: 2 }}>
                      {connectMentor && (
                        <span title="Ofrece mentores" style={{ color: "var(--accentBlue)", display: "flex" }}>
                          <IconUsers size={13} />
                        </span>
                      )}
                      {connectProvider && (
                        <span title="Ofrece proveedores" style={{ color: "var(--accentBlue)", display: "flex" }}>
                          <IconBag size={13} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-3">
        <div className="card stack">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontWeight: 700 }}>Nivel {progress.level}</span>
            <span className="muted">
              {progress.xp} / {xpForNextLevel} XP
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ transform: `scaleX(${xpProgress / 100})` }} />
          </div>
        </div>

        <div className="card stack">
          <h2>Qué incluye</h2>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            {Object.entries(categoryLabel).filter(([key]) => steps.some((step) => step.category === key)).map(([key, label]) => {
              const Icon = categoryIcon[key];
              return (
                <div key={key} className="row" style={{ alignItems: "center", gap: 6 }}>
                  <div style={{ color: "var(--accentBlue)" }}>
                    <Icon size={14} />
                  </div>
                  <span className="muted" style={{ fontSize: 11.5 }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button className="btn btn-secondary" onClick={() => navigate("/comunidad")} style={{ alignSelf: "center", height: "fit-content" }}>
          Ver comunidad
        </button>
      </div>
      {celebrating && <p className="roadmap-completion-note" role="status">Evidencia registrada. Tu siguiente paso ya está disponible.</p>}
    </div>
  );
}
