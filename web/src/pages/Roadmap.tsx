import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { IconCheck, IconLock, IconForm, IconUsers, IconChart, IconChat, IconBag, IconRoute } from "../components/icons";

const categoryIcon: Record<string, (props: { size?: number }) => JSX.Element> = {
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
  const { steps, progress } = useApp();

  const xpForNextLevel = progress.level * 400;
  const xpProgress = Math.min(100, Math.round((progress.xp % 400) / 4));
  const startX = 90;
  const timelineWidth = Math.max((steps.length - 1) * nodeGap + startX * 2, 720);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 4 }}>
        <h1>Tu camino</h1>
        <p>Cada paso te acerca a un negocio real. Complétalos a tu ritmo — desliza para ver todo el camino.</p>
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
                  className={available ? "pulse-ring" : undefined}
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
                    {categoryLabel[step.category]}
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
          <h2>Categorías</h2>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            {Object.entries(categoryLabel).map(([key, label]) => {
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
    </div>
  );
}
