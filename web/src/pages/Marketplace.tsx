import { useNavigate } from "react-router-dom";
import { providers } from "../data/mockData";

export default function Marketplace() {
  const navigate = useNavigate();

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 4 }}>
          <h1>Marketplace</h1>
          <p>Proveedores de productos y servicios validados por la comunidad.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/proveedor/nuevo")}>
          Registrarme como proveedor
        </button>
      </div>

      <div className="grid-3">
        {providers.map((p) => (
          <div key={p.id} className="card stack" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
              <span className="pill">{p.type === "producto" ? "Producto" : "Servicio"}</span>
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
