import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { IconCheck } from "../components/icons";

export default function ProviderSignup() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="card stack" style={{ maxWidth: 440, alignItems: "center", textAlign: "center", padding: 40, gap: 14 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--successBg)",
            color: "var(--success)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconCheck size={22} />
        </div>
        <h1>¡Listo!</h1>
        <p>Tu perfil de proveedor está en revisión. Pronto aparecerás en el marketplace.</p>
        <button className="btn btn-primary" onClick={() => navigate("/marketplace")}>
          Volver al marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 560 }}>
      <div className="stack" style={{ gap: 4 }}>
        <h1>Regístrate como proveedor</h1>
        <p>Llega a cientos de nuevos negocios que están arrancando.</p>
      </div>

      <form className="card stack" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="pname">Nombre del negocio / proveedor</label>
          <input id="pname" required placeholder="Ej. Café Altura Mayor" />
        </div>
        <div className="field">
          <label htmlFor="ptype">Tipo</label>
          <select id="ptype">
            <option value="producto">Producto</option>
            <option value="servicio">Servicio</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="pcat">Categoría a la que atiendes</label>
          <input id="pcat" required placeholder="Ej. Cafeterías" />
        </div>
        <div className="field">
          <label htmlFor="ploc">Ubicación</label>
          <input id="ploc" required placeholder="Ciudad, país" />
        </div>
        <div className="field">
          <label htmlFor="pdesc">Descripción breve</label>
          <textarea id="pdesc" rows={3} required placeholder="¿Qué ofreces y bajo qué condiciones?" />
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
          Enviar registro
        </button>
      </form>
    </div>
  );
}
