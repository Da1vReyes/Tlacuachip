import { useNavigate } from "react-router-dom";
import { providers } from "../data/mockData";
import { providerKindLabel } from "../lib/matching";

export default function Marketplace() {
  const navigate = useNavigate();

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div className="stack" style={{ gap: 4 }}>
          <h1>Marketplace</h1>
          <p>Toda la red de profesionales y proveedores. Para ver quién te conviene ahora, revisa <button className="btn btn-ghost" style={{ padding: 0, fontSize: "inherit" }} onClick={() => navigate("/equipo")}>Tu equipo</button>.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/auth?role=provider")}>
          Registrarme como proveedor
        </button>
      </div>

      <div className="grid-3">
        {providers.map((p) => (
          <div key={p.id} className="card stack" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span className="pill">{providerKindLabel[p.kind]}</span>
                {p.isAI && <span className="pill pill-warn">Agente de IA</span>}
              </div>
            </div>
            <p>{p.description}</p>
            <span className="muted">
              {p.location} · ★ {p.rating}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
