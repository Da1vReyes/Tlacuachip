import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { IconLeaf, IconRoute, IconChart, IconUsers } from "../components/icons";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useApp();

  return (
    <div className="auth-page">
      <div className="landing-layout">
        <div className="stack" style={{ gap: 22 }}>
          <div className="row" style={{ alignItems: "center", gap: 10 }}>
            <div className="sidebar-logo-mark" style={{ width: 36, height: 36 }}>
              <IconLeaf size={18} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Tlacuachip</span>
          </div>
          <h1 className="landing-title">Empieza tu negocio con datos de tu zona.</h1>
          <p style={{ fontSize: 15.5 }}>
            Cuéntanos qué quieres emprender y cuánto tienes para invertir. Te damos un reporte
            con datos oficiales de tu localidad y un roadmap paso a paso para arrancar.
          </p>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-primary" style={{ padding: "12px 24px" }} onClick={() => navigate(user ? "/formulario" : "/auth")}>
              Empieza tu negocio
            </button>
            {!user && (
              <button className="btn btn-secondary" style={{ padding: "12px 24px" }} onClick={() => navigate("/auth")}>
                Ya tengo una cuenta
              </button>
            )}
          </div>
        </div>

        <div className="landing-evidence">
          <div className="landing-evidence-row">
            <div className="landing-evidence-icon">
              <IconChart size={16} />
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Reporte de mercado</span>
              <span className="muted">Datos oficiales de tu localidad</span>
            </div>
          </div>
          <div className="landing-evidence-row">
            <div className="landing-evidence-icon">
              <IconRoute size={16} />
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Roadmap gamificado</span>
              <span className="muted">Un paso a la vez, con XP y niveles</span>
            </div>
          </div>
          <div className="landing-evidence-row">
            <div className="landing-evidence-icon">
              <IconUsers size={16} />
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Mentores y proveedores</span>
              <span className="muted">Conecta con quien ya lo hizo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
