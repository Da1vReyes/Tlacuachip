import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { postJson } from "../lib/api";

interface StepHelpResponse { source: "llm" | "fallback"; model: string | null; answer: string; nextAction: string; }
const taskExplanationCache = new Map<string, StepHelpResponse>();
const taskExplanationPending = new Map<string, Promise<StepHelpResponse>>();

export default function StepDetail() {
  const { stepId } = useParams();
  const navigate = useNavigate();
  const { steps, completeStep, businessForm } = useApp();
  const [evidenceByStep, setEvidenceByStep] = useState<Record<string, string[]>>({});
  const [question, setQuestion] = useState("");
  const [help, setHelp] = useState<StepHelpResponse | null>(null);
  const [asking, setAsking] = useState(false);
  const [taskExplanation, setTaskExplanation] = useState<StepHelpResponse | null>(null);
  const [explainingTask, setExplainingTask] = useState(false);
  const [evidenceHelp, setEvidenceHelp] = useState<{ item: string; response: StepHelpResponse } | null>(null);
  const [explainingEvidence, setExplainingEvidence] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const step = steps.find((item) => item.id === stepId);

  useEffect(() => { if (!step) navigate("/roadmap", { replace: true }); }, [step, navigate]);
  const profile = useMemo(() => businessForm ? ({ businessType: businessForm.businessType, category: businessForm.category, city: businessForm.location.city, experience: businessForm.experience, description: businessForm.description ?? "" }) : null, [businessForm]);
  useEffect(() => {
    if (!step || !profile) return;
    const cacheKey = `${step.id}:${profile.businessType}:${profile.city}:${profile.description}`;
    let cancelled = false;
    const cached = taskExplanationCache.get(cacheKey);
    if (cached) { setTaskExplanation(cached); setExplainingTask(false); return; }
    setExplainingTask(true); setTaskExplanation(null);
    const pending = taskExplanationPending.get(cacheKey) ?? postJson<StepHelpResponse>("/api/step-help", {
      step: { title: step.title, summary: step.detail.summary, instructions: step.detail.instructions },
      profile, completed: [],
      question: "Explica esta tarea en palabras simples para mi negocio y di qué resultado debo tener al terminar.",
    }).catch(() => ({ source: "fallback" as const, model: null, answer: `Este paso consiste en validar “${step.title}” antes de seguir con tu negocio.`, nextAction: "Revisa qué evidencia te pide el paso y contrástala con la fuente oficial." }));
    taskExplanationPending.set(cacheKey, pending);
    void pending.then((response) => { taskExplanationCache.set(cacheKey, response); if (!cancelled) setTaskExplanation(response); }).finally(() => { taskExplanationPending.delete(cacheKey); if (!cancelled) setExplainingTask(false); });
    return () => { cancelled = true; };
  }, [step, profile]);
  if (!step) return null;

  const confirmedEvidence = evidenceByStep[step.id] ?? [];
  const isCompleted = step.status === "completed";
  const evidenceComplete = step.detail.evidence.every((item) => confirmedEvidence.includes(item));
  const shareUrl = `${window.location.origin}/#/roadmap`;
  const toggleEvidence = (item: string) => setEvidenceByStep((current) => { const items = current[step.id] ?? []; return { ...current, [step.id]: items.includes(item) ? items.filter((value) => value !== item) : [...items, item] }; });
  const ask = async () => {
    if (!question.trim() || !profile) return;
    setAsking(true); setHelp(null);
    try { setHelp(await postJson<StepHelpResponse>("/api/step-help", { step: { title: step.title, summary: step.detail.summary, instructions: step.detail.instructions }, profile, completed: [], question })); }
    catch { setHelp({ source: "fallback", model: null, answer: "No pude consultar la IA ahora. Revisa la fuente oficial o conversa con alguien que atienda este paso.", nextAction: "Revisa tu evidencia antes de cerrar el paso." }); }
    finally { setAsking(false); }
  };
  const explainEvidence = async (item: string) => {
    if (!profile) return;
    setExplainingEvidence(item); setEvidenceHelp(null);
    try {
      const response = await postJson<StepHelpResponse>("/api/step-help", {
        step: { title: step.title, summary: step.detail.summary, instructions: step.detail.instructions },
        profile, completed: [],
        question: `Explícame en palabras simples cómo obtener o preparar esta evidencia para mi negocio: “${item}”. Da pasos prácticos sin inventar requisitos.`,
      });
      setEvidenceHelp({ item, response });
    } catch {
      setEvidenceHelp({ item, response: { source: "fallback", model: null, answer: "Esta evidencia te ayuda a demostrar que no avanzaste sólo por una suposición. Contrástala con la fuente oficial indicada para este paso.", nextAction: `Revisa si ya cuentas con: ${item}.` } });
    } finally { setExplainingEvidence(null); }
  };

  return <div className="step-detail-layout">
    <main className="step-detail-main stack" style={{ gap: 20 }}>
      <header className="stack" style={{ gap: 7 }}><span className="step-resource-kicker">México · paso de formalización</span><h1>{step.title}</h1><p>{step.detail.summary}</p></header>
      <section className="card stack" style={{ gap: 14 }}>
        <h2>Qué vas a hacer</h2>
        {taskExplanation ? <div className="step-help-response" role="status"><strong>Explicación para tu caso</strong><p>{taskExplanation.answer}</p><small><b>Al terminar:</b> {taskExplanation.nextAction}</small></div> : <p className="muted" role="status" style={{ fontSize: 13 }}>{explainingTask ? "Preparando una explicación para tu caso…" : "Preparando la tarea…"}</p>}
      </section>
      <section className="card stack" style={{ gap: 10 }}><div><h2>Qué debes guardar</h2><p className="muted" style={{ fontSize: 13, margin: "3px 0 0" }}>Abre una rama para ver cómo prepararla en tu caso.</p></div><div className="evidence-tree">{step.detail.evidence.map((item, index) => <div key={item} className="evidence-tree-node"><div className="evidence-tree-row"><label className="evidence-item"><input type="checkbox" checked={confirmedEvidence.includes(item)} disabled={isCompleted} onChange={() => toggleEvidence(item)} /><span>{item}</span></label><button type="button" className="btn btn-ghost evidence-explain" disabled={explainingEvidence === item} onClick={() => explainEvidence(item)}>{explainingEvidence === item ? "Explicando…" : "Cómo hacerlo"}</button></div>{evidenceHelp?.item === item && <div className="step-help-response evidence-help" role="status"><p>{evidenceHelp.response.answer}</p><small><b>Ahora:</b> {evidenceHelp.response.nextAction}</small></div>}{index < step.detail.evidence.length - 1 && <span className="evidence-tree-line" aria-hidden="true" />}</div>)}</div></section>
      <section className="card stack" style={{ gap: 10 }}><div><h2>¿Necesitas a alguien?</h2><p className="muted" style={{ fontSize: 13 }}>Habla con un profesional o con tu equipo.</p></div><div className="row" style={{ gap: 8, flexWrap: "wrap" }}><button className="btn btn-secondary" onClick={() => navigate("/equipo")}>Buscar ayuda</button><button className="btn btn-ghost" onClick={() => navigate("/mensajes")}>Mensajes</button></div></section>
      <button className="btn btn-primary" disabled={isCompleted || !evidenceComplete || isCompleting} onClick={() => { completeStep(step.id); setIsCompleting(true); window.setTimeout(() => navigate("/roadmap", { state: { completedStepId: step.id } }), 620); }}>{isCompleted ? "Paso confirmado" : isCompleting ? "Guardando avance…" : !evidenceComplete ? "Marca tu evidencia para continuar" : "Cerrar este paso"}</button>
      {isCompleted && <section className="card stack" style={{ gap: 10 }}><h2>Avance registrado</h2><p className="muted" style={{ fontSize: 13 }}>Documentaste este paso; no significa que todos los requisitos del negocio estén resueltos.</p><div className="row" style={{ gap: 10, flexWrap: "wrap" }}><a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}>Compartir en LinkedIn</a><button className="btn btn-primary" onClick={() => navigate("/roadmap")}>Volver a mi ruta</button></div></section>}
    </main>
    <aside className="step-detail-aside stack" aria-label="Ayuda para este paso">
      <section className="card stack step-helper" style={{ gap: 10 }}><span className="step-resource-kicker">Asistente de tarea</span><h2>¿Tienes una duda?</h2><p className="muted" style={{ fontSize: 13 }}>Pregunta algo puntual sobre este paso.</p><div className="step-question-suggestions"><button type="button" onClick={() => setQuestion("No sé si este trámite aplica para mi tipo de negocio.")}>¿Aplica a mi negocio?</button><button type="button" onClick={() => setQuestion("No sé qué debo confirmar antes de pagar o firmar algo.")}>¿Qué confirmo primero?</button></div><textarea rows={4} maxLength={700} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Escribe una duda concreta…" /><button className="btn btn-primary" disabled={!question.trim() || asking} onClick={ask}>{asking ? "Pensando…" : "Preguntar a la IA"}</button>{help && <div className="step-help-response" role="status"><strong>{help.source === "llm" ? "Respuesta para tu caso" : "Guía base"}</strong><p>{help.answer}</p><small><b>Siguiente acción:</b> {help.nextAction}</small></div>}</section>
    </aside>
  </div>;
}
