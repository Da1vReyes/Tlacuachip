import { useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { generateReport } from "../lib/report";
import type { BusinessCategory } from "../types";
import {
  IconArrowLeft,
  IconCoffee,
  IconUtensils,
  IconBasket,
  IconScissors,
  IconWrench,
  IconPencil,
  IconSparkle,
  IconCheck,
} from "../components/icons";

const categories: { value: BusinessCategory; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { value: "cafeteria", label: "Cafetería", icon: IconCoffee },
  { value: "restaurante", label: "Restaurante", icon: IconUtensils },
  { value: "tienda-abarrotes", label: "Abarrotes", icon: IconBasket },
  { value: "salon-belleza", label: "Salón de belleza", icon: IconScissors },
  { value: "taller-mecanico", label: "Taller mecánico", icon: IconWrench },
  { value: "papeleria", label: "Papelería", icon: IconPencil },
  { value: "otro", label: "Otro", icon: IconSparkle },
];

const countries = ["Mexico", "Colombia", "Argentina", "Chile", "Peru", "Otro"] as const;
const countryLabel: Record<(typeof countries)[number], string> = {
  Mexico: "México",
  Colombia: "Colombia",
  Argentina: "Argentina",
  Chile: "Chile",
  Peru: "Perú",
  Otro: "Otro",
};

const experienceLevels: { value: "ninguna" | "poca" | "intermedia" | "experto"; label: string; desc: string; bars: number }[] = [
  { value: "ninguna", label: "Primera vez", desc: "Nunca he tenido un negocio", bars: 1 },
  { value: "poca", label: "Algo de experiencia", desc: "He ayudado o probado antes", bars: 2 },
  { value: "intermedia", label: "Con experiencia", desc: "Ya manejé un negocio antes", bars: 3 },
  { value: "experto", label: "Experto", desc: "Tengo o tuve varios negocios", bars: 4 },
];

const TOTAL_STEPS = 6;

export default function BusinessForm() {
  const navigate = useNavigate();
  const { user, saveBusinessForm, saveReport } = useApp();

  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState("");
  const [category, setCategory] = useState<BusinessCategory | null>(null);
  const [budget, setBudget] = useState(50000);
  const [country, setCountry] = useState<(typeof countries)[number]>("Mexico");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [experience, setExperience] = useState<"ninguna" | "poca" | "intermedia" | "experto" | null>(null);
  const [description, setDescription] = useState("");
  const [customer, setCustomer] = useState("");
  const [placeStatus, setPlaceStatus] = useState<"buscando" | "tengo-local" | "desde-casa" | "">("");
  const [readiness, setReadiness] = useState<"solo-idea" | "ya-vendo" | "ya-tengo-proveedor" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canAdvance = [
    businessType.trim().length > 0,
    category !== null,
    budget >= 50,
    state.trim().length > 0 && city.trim().length > 0,
    experience !== null,
    true, // description is optional
  ][step];

  const submitForm = async (exp: NonNullable<typeof experience>, cat: NonNullable<typeof category>) => {
    sessionStorage.setItem("tlacuachic-location-hint", locationHint.trim());
    const form = {
      businessType,
      category: cat,
      budget,
      location: { country, state, city },
      experience: exp,
      description: [
        description.trim(),
        customer.trim() && `Cliente al que busca atender: ${customer.trim()}.`,
        locationHint.trim() && `Zona que quiere revisar: ${locationHint.trim()}.`,
        placeStatus && `Situación del lugar: ${placeStatus === "buscando" ? "aún busca ubicación" : placeStatus === "tengo-local" ? "ya tiene un local o zona definida" : "iniciará desde casa o sin local abierto al público"}.`,
        readiness && `Etapa actual: ${readiness === "solo-idea" ? "todavía está validando la idea" : readiness === "ya-vendo" ? "ya tiene primeras ventas" : "ya cuenta con proveedores o aliados iniciales"}.`,
      ].filter(Boolean).join(" ").slice(0, 600) || undefined,
    };
    saveBusinessForm(form);
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const report = await generateReport(form);
      saveReport(report);
      navigate(user ? "/onboarding/mapa" : "/auth");
    } catch (err) {
      setSubmitError(err instanceof Error ? `${err.message}. Revisa tu conexión e inténtalo de nuevo; no mostramos un reporte inventado.` : "No se pudo generar tu reporte. Revisa tu conexión e inténtalo de nuevo.");
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (!canAdvance || isSubmitting) return;
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    submitForm(experience!, category!);
  };

  const goBack = () => {
    if (step === 0) {
      navigate(-1);
      return;
    }
    setStep((s) => s - 1);
  };

  return (
    <div className="wizard-page">
      <div className="wizard-topbar">
        <button className="topbar-back" onClick={goBack} aria-label="Volver">
          <IconArrowLeft size={15} />
        </button>
        <div className="wizard-progress">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="wizard-progress-seg">
              <div className="wizard-progress-fill" style={{ transform: `scaleX(${i <= step ? 1 : 0})` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-body">
        <div key={step} className="wizard-step stack" style={{ gap: 24 }}>
          {step === 0 && (
            <div className="stack wizard-start" style={{ gap: 18 }}>
              <span className="pill">Paso 1 de {TOTAL_STEPS}</span>
              <h1 className="wizard-question">Empecemos por tu idea.</h1>
              <p className="wizard-intro">No necesitas conocer todos los requisitos hoy. Cuéntanos qué quieres construir y después ordenaremos lo que vale la pena mirar: zona, presupuesto, trámites y apoyo.</p>
              <label className="wizard-field-label" htmlFor="business-idea">Nombre o idea breve</label>
              <input
                id="business-idea"
                autoFocus
                className="wizard-amount"
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: "var(--primaryText)",
                  border: "none",
                  borderBottom: "2.5px solid var(--mainBorder)",
                  borderRadius: 0,
                  padding: "8px 2px",
                  background: "transparent",
                  outline: "none",
                }}
                placeholder="Ej. Café Nopal · café de especialidad de barrio"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goNext()}
              />
              <p className="wizard-next">No es la categoría. Danos una frase para reconocer tu proyecto; después elegimos el giro.</p>
            </div>
          )}

          {step === 1 && (
            <div className="stack" style={{ gap: 18 }}>
              <span className="pill">Paso 2 de {TOTAL_STEPS}</span>
              <h1 className="wizard-question">¿En qué categoría entra?</h1>
              <div className="chip-grid">
                {categories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`chip-card${category === c.value ? " selected" : ""}`}
                    onClick={() => {
                      setCategory(c.value);
                      setTimeout(() => setStep((s) => s + 1), 220);
                    }}
                  >
                    <div className="chip-card-icon">
                      <c.icon size={20} />
                    </div>
                    <span className="chip-card-label">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="stack" style={{ gap: 18 }}>
              <span className="pill">Paso 3 de {TOTAL_STEPS}</span>
              <h1 className="wizard-question">¿Cuánto dinero tienes para invertir?</h1>
              <p>Desliza para ajustar. Entre $50 y $500,000 MXN.</p>
              <div className="stack" style={{ gap: 14, alignItems: "center" }}>
                <span className="wizard-amount">${budget.toLocaleString()}</span>
                <input
                  className="wizard-slider"
                  type="range"
                  min={50}
                  max={500000}
                  step={500}
                  value={budget}
                  style={{ ["--fill" as string]: `${((budget - 50) / (500000 - 50)) * 100}%` }}
                  onChange={(e) => setBudget(Number(e.target.value))}
                />
                <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                  <span className="muted">$50</span>
                  <span className="muted">$500,000</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="stack" style={{ gap: 18 }}>
              <span className="pill">Paso 4 de {TOTAL_STEPS}</span>
              <h1 className="wizard-question">¿Dónde está tu negocio?</h1>
              <div className="chip-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                {countries.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip-card${country === c ? " selected" : ""}`}
                    style={{ padding: "14px 10px" }}
                    onClick={() => setCountry(c)}
                  >
                    <span className="chip-card-label">{countryLabel[c]}</span>
                  </button>
                ))}
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="state">Estado</label>
                  <input id="state" autoFocus value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="city">Ciudad</label>
                  <input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goNext()}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="location-hint">¿Ya tienes una zona o local en mente? <span className="muted">(opcional)</span></label>
                <input id="location-hint" value={locationHint} onChange={(e) => setLocationHint(e.target.value)} placeholder="Ej. Santa Fe, cerca de la universidad" />
                <span className="muted">Después podrás buscarlo y confirmar el punto exacto en un mapa.</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="stack" style={{ gap: 18 }}>
              <span className="pill">Paso 5 de {TOTAL_STEPS}</span>
              <h1 className="wizard-question">Tu experiencia en este giro</h1>
              <div className="stack" style={{ gap: 10 }}>
                {experienceLevels.map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    className={`level-card${experience === lvl.value ? " selected" : ""}`}
                    onClick={() => {
                      setExperience(lvl.value);
                      setTimeout(() => setStep(5), 220);
                    }}
                  >
                    <div className="level-bars">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className={`level-bar${n <= lvl.bars ? " filled" : ""}`}
                          style={{ height: 6 + n * 4 }}
                        />
                      ))}
                    </div>
                    <div className="stack" style={{ gap: 1, flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{lvl.label}</span>
                      <span className="muted">{lvl.desc}</span>
                    </div>
                    {experience === lvl.value && (
                      <span style={{ color: "var(--accentBlue)" }}>
                        <IconCheck size={18} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="stack" style={{ gap: 18 }}>
              <span className="pill">Paso 6 de {TOTAL_STEPS}</span>
              <h1 className="wizard-question">Tres cosas para entender tu punto de partida</h1>
              <p>Solo usamos esto para adaptar tu información y la ayuda del camino. No se comparte automáticamente con profesionales.</p>
              <div className="field"><label htmlFor="customer">¿A quién quieres atender?</label><input id="customer" maxLength={140} placeholder="Ej. estudiantes y personas que trabajan cerca" value={customer} onChange={(event) => setCustomer(event.target.value)} /></div>
              <div className="stack" style={{ gap: 8 }}><span className="wizard-field-label">¿Dónde operarías?</span><div className="row" style={{ gap: 8, flexWrap: "wrap" }}>{(["buscando", "tengo-local", "desde-casa"] as const).map((value) => <button type="button" key={value} className={`btn ${placeStatus === value ? "btn-primary" : "btn-secondary"}`} onClick={() => setPlaceStatus(value)}>{value === "buscando" ? "Busco local" : value === "tengo-local" ? "Ya tengo zona o local" : "Desde casa"}</button>)}</div></div>
              <div className="stack" style={{ gap: 8 }}><span className="wizard-field-label">¿Qué ya tienes?</span><div className="row" style={{ gap: 8, flexWrap: "wrap" }}>{(["solo-idea", "ya-vendo", "ya-tengo-proveedor"] as const).map((value) => <button type="button" key={value} className={`btn ${readiness === value ? "btn-primary" : "btn-secondary"}`} onClick={() => setReadiness(value)}>{value === "solo-idea" ? "Solo la idea" : value === "ya-vendo" ? "Ya tengo ventas" : "Ya tengo aliados"}</button>)}</div></div>
              <div className="field">
                <label htmlFor="description">Algo más que quieras que la IA sepa (opcional)</label>
                <textarea
                  id="description"
                  rows={3}
                  maxLength={360}
                  placeholder="Ej. Quiero especializarme en café de productores mexicanos y vender grano para llevar."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                />
                <span className="muted" style={{ alignSelf: "flex-end" }}>{description.length}/360</span>
              </div>
              {submitError && <span className="muted" style={{ color: "var(--warn)" }}>No se pudo generar tu reporte con IA ({submitError}). Intenta de nuevo.</span>}
            </div>
          )}

          {step !== 1 && step !== 4 && (
            <button className="btn btn-primary" disabled={!canAdvance || isSubmitting} onClick={goNext} style={{ alignSelf: "flex-start", padding: "12px 28px" }}>
              {isSubmitting ? "Generando tu reporte con datos reales…" : step === TOTAL_STEPS - 1 ? "Generar mi reporte" : "Continuar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
