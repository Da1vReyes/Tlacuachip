import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function StepDetail() {
  const { stepId } = useParams();
  const navigate = useNavigate();
  const { steps, completeStep } = useApp();
  const [evidenceByStep, setEvidenceByStep] = useState<Record<string, string[]>>({});

  const step = steps.find((s) => s.id === stepId);

  useEffect(() => {
    if (!step) navigate("/roadmap", { replace: true });
  }, [step, navigate]);

  if (!step) {
    return null;
  }

  const isCompleted = step.status === "completed";
  const confirmedEvidence = evidenceByStep[step.id] ?? [];
  const evidenceComplete = step.detail.evidence.every((item) => confirmedEvidence.includes(item));
  const shareUrl = `${window.location.origin}/#/roadmap`;
  const shareText = `Completé “${step.title}” en mi ruta de formalización de Tlacuachip. Sigo construyendo mi negocio paso a paso.`;
  const statusLabel = step.detail.applicability === "base" ? "Paso base" : step.detail.applicability === "conditional" ? "Según tu giro" : "Recomendado al crecer";

  const toggleEvidence = (item: string) => {
    setEvidenceByStep((current) => {
      const currentItems = current[step.id] ?? [];
      const nextItems = currentItems.includes(item) ? currentItems.filter((value) => value !== item) : [...currentItems, item];
      return { ...current, [step.id]: nextItems };
    });
  };

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 640 }}>
      <div className="stack" style={{ gap: 4 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill pill-warn">+{step.xp} XP</span>
          <span className="pill">México · {statusLabel}</span>
        </div>
        <h1>{step.title}</h1>
        <p>{step.detail.summary}</p>
      </div>

      <div className="card stack" style={{ gap: 4 }}>
        <span className="muted" style={{ fontSize: 12 }}>Autoridad o responsable</span>
        <strong>{step.detail.authority}</strong>
        {step.detail.caution && <p className="muted" style={{ fontSize: 13 }}>{step.detail.caution}</p>}
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

      <div className="card stack" style={{ gap: 10 }}>
        <h2>Antes de marcar este paso</h2>
        <p className="muted" style={{ fontSize: 13 }}>Confirma lo que ya tienes documentado. Tlacuachip registra tu avance; no emite permisos ni reemplaza una validación oficial.</p>
        <div className="stack" style={{ gap: 8 }}>
          {step.detail.evidence.map((item) => {
            const checked = confirmedEvidence.includes(item);
            return (
              <label key={item} className="evidence-item">
                <input type="checkbox" checked={checked} onChange={() => toggleEvidence(item)} disabled={isCompleted} />
                <span>{item}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <h2>Fuentes oficiales</h2>
        {step.detail.officialLinks.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ textAlign: "center" }}>
            Abrir: {link.label}
          </a>
        ))}
      </div>

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
        disabled={isCompleted || !evidenceComplete}
        onClick={() => {
          completeStep(step.id);
        }}
      >
        {isCompleted ? "Paso confirmado" : evidenceComplete ? "Confirmar evidencia y completar" : `Confirma ${step.detail.evidence.length - confirmedEvidence.length} evidencia${step.detail.evidence.length - confirmedEvidence.length === 1 ? "" : "s"}`}
      </button>

      {isCompleted && (
        <div className="card stack" style={{ gap: 10 }}>
          <h2>Comparte el avance, no una promesa</h2>
          <p className="muted" style={{ fontSize: 13 }}>El logro comunica que documentaste este paso; no afirma que todos los requisitos del negocio estén resueltos.</p>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}>Compartir en LinkedIn</a>
            <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}>Compartir en X</a>
            <button className="btn btn-primary" onClick={() => navigate("/roadmap")}>Volver a mi ruta</button>
          </div>
        </div>
      )}
    </div>
  );
}
