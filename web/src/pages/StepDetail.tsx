import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function StepDetail() {
  const { stepId } = useParams();
  const navigate = useNavigate();
  const { steps, completeStep } = useApp();

  const step = steps.find((s) => s.id === stepId);

  useEffect(() => {
    if (!step) navigate("/roadmap", { replace: true });
  }, [step, navigate]);

  if (!step) {
    return null;
  }

  const isCompleted = step.status === "completed";

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 640 }}>
      <div className="stack" style={{ gap: 4 }}>
        <span className="pill pill-warn">+{step.xp} XP</span>
        <h1>{step.title}</h1>
        <p>{step.detail.summary}</p>
      </div>

      <div className="card stack">
        <h2>Cómo hacerlo</h2>
        <div className="stack" style={{ gap: 10 }}>
          {step.detail.instructions.map((instr, i) => (
            <div key={i} className="row" style={{ alignItems: "flex-start", gap: 10 }}>
              <span
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--navItemActiveBg)",
                  color: "var(--navItemTextActive)",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </span>
              <p style={{ color: "var(--primaryText)" }}>{instr}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="row">
        <div className="card" style={{ flex: 1 }}>
          <div className="muted">Costo</div>
          <div style={{ fontWeight: 700 }}>
            {step.detail.hasCost ? step.detail.estimatedCost ?? "Tiene costo" : "Gratis"}
          </div>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <div className="muted">Modalidad</div>
          <div style={{ fontWeight: 700 }}>{step.detail.canDoOnline ? "En línea" : "Presencial"}</div>
        </div>
      </div>

      {step.detail.officialLink && (
        <a href={step.detail.officialLink.url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ textAlign: "center" }}>
          Ir al sitio oficial: {step.detail.officialLink.label}
        </a>
      )}

      {step.detail.connectTo && step.detail.connectTo.length > 0 && (
        <div className="stack">
          {step.detail.connectTo.includes("mentores") && (
            <button className="btn btn-secondary" onClick={() => navigate("/mentores")}>
              Conectar con mentores
            </button>
          )}
          {step.detail.connectTo.includes("proveedores") && (
            <button className="btn btn-secondary" onClick={() => navigate("/marketplace")}>
              Ver proveedores
            </button>
          )}
        </div>
      )}

      <button
        className="btn btn-primary"
        disabled={isCompleted}
        onClick={() => {
          completeStep(step.id);
          navigate("/roadmap");
        }}
      >
        {isCompleted ? "Ya completado" : "Marcar como completado"}
      </button>
    </div>
  );
}
