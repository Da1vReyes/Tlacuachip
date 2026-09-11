import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { roadmapSteps } from "../data/mockData";
import { providerKindLabel } from "../lib/matching";
import { IconCheck } from "../components/icons";

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user, providerProfile } = useApp();

  useEffect(() => {
    if (!user) navigate("/auth?role=provider", { replace: true });
    else if (!providerProfile) navigate("/proveedor/nuevo", { replace: true });
  }, [user, providerProfile, navigate]);

  if (!user || !providerProfile) return null;

  const matchedSteps = roadmapSteps.filter((s) => providerProfile.helpsWith.includes(s.id));

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 4 }}>
        <span className="pill">{providerKindLabel[providerProfile.kind]}{providerProfile.isAI ? " · Agente de IA" : ""}</span>
        <h1>Hola, {providerProfile.name}</h1>
        <p>Así funciona tu presencia en la red: apareces cuando un emprendedor tiene pendiente un paso en el que tú ayudas.</p>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card stack" style={{ gap: 10 }}>
          <h2>Así te ven los emprendedores</h2>
          <div className="stack" style={{ gap: 6, paddingTop: 6, borderTop: "1px solid var(--mainBorder)" }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <strong style={{ fontSize: 14 }}>{providerProfile.name}</strong>
              <span className="pill">{providerKindLabel[providerProfile.kind]}</span>
            </div>
            <p>{providerProfile.description}</p>
            <span className="muted">{providerProfile.city}, {providerProfile.country === "Mexico" ? "México" : providerProfile.country}</span>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate("/proveedor/nuevo")}>Editar perfil</button>
        </div>

        <div className="card stack" style={{ gap: 10 }}>
          <h2>Cuándo apareces</h2>
          <p className="muted" style={{ fontSize: 13 }}>Cada vez que un emprendedor llega a uno de estos pasos, tu perfil entra en su equipo recomendado.</p>
          <div className="stack" style={{ gap: 8 }}>
            {matchedSteps.map((s) => (
              <div key={s.id} className="row" style={{ alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "var(--success)", marginTop: 2 }}><IconCheck size={14} /></span>
                <div className="stack" style={{ gap: 1 }}>
                  <strong style={{ fontSize: 13 }}>{s.title}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{s.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <h2>Solicitudes</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Aún no hay emprendedores en {providerProfile.city} que hayan compartido datos clave contigo. Cuando lo hagan, verás giro, ciudad y etapa — nunca su correo, nombre ni presupuesto exacto, salvo que ellos elijan compartir su perfil completo.
        </p>
        <div className="stack" style={{ gap: 6, padding: 12, border: "1px dashed var(--mainBorder)", borderRadius: "var(--radius)" }}>
          <span className="muted" style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase" }}>Ejemplo ilustrativo</span>
          <strong style={{ fontSize: 13 }}>Cafetería · Ciudad de México</strong>
          <span className="muted" style={{ fontSize: 12.5 }}>Siguiente paso pendiente: Obtén tu RFC · presupuesto en rango $20,000 – $100,000 MXN</span>
        </div>
      </div>

      <div className="card stack" style={{ gap: 8 }}>
        <h2>Cómo se sostiene Tlacuachip</h2>
        <p className="muted" style={{ fontSize: 13 }}>Durante el prototipo no hay suscripción ni comisión. Cuando existan, serán las únicas dos fuentes de ingreso: una suscripción para proveedores por aparecer en la red y una comisión por acuerdo cerrado dentro de la plataforma. Los datos de los usuarios nunca se venden ni se usan para publicidad.</p>
      </div>
    </div>
  );
}
