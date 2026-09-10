import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { IconLeaf, IconRoute, IconChart, IconUsers } from "../components/icons";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useApp();

  return (
    <div className="auth-page">
      <div style={{ width: "100%", maxWidth: 900, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48, alignItems: "center" }}>
        <div className="stack" style={{ gap: 22 }}>
          <div className="row" style={{ alignItems: "center", gap: 10 }}>
            <div className="sidebar-logo-mark" style={{ width: 36, height: 36 }}>
              <IconLeaf size={18} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Tlacuachip</span>
          </div>
          <h1 style={{ fontSize: 40 }}>Empieza tu negocio con datos reales de tu zona</h1>
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

        <div className="stack" style={{ gap: 14 }}>
          <div className="card row" style={{ alignItems: "center", gap: 14 }}>
            <div className="sidebar-logo-mark" style={{ background: "var(--accentBlue)" }}>
              <IconChart size={16} />
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Reporte de mercado</span>
              <span className="muted">Datos oficiales de tu localidad</span>
            </div>
          </div>
          <div className="card row" style={{ alignItems: "center", gap: 14 }}>
            <div className="sidebar-logo-mark" style={{ background: "var(--accentBlue)" }}>
              <IconRoute size={16} />
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Roadmap gamificado</span>
              <span className="muted">Un paso a la vez, con XP y niveles</span>
            </div>
          </div>
          <div className="card row" style={{ alignItems: "center", gap: 14 }}>
            <div className="sidebar-logo-mark" style={{ background: "var(--accentBlue)" }}>
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
