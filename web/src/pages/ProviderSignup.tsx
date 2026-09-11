import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { roadmapSteps } from "../data/mockData";
import { providerKindLabel } from "../lib/matching";
import type { ProviderKind } from "../types";

const kinds = Object.keys(providerKindLabel) as ProviderKind[];

export default function ProviderSignup() {
  const navigate = useNavigate();
  const { user, providerProfile, saveProviderProfile, setRole } = useApp();

  const [name, setName] = useState(providerProfile?.name ?? "");
  const [kind, setKind] = useState<ProviderKind>(providerProfile?.kind ?? "contador");
  const [isAI, setIsAI] = useState(providerProfile?.isAI ?? false);
  const [city, setCity] = useState(providerProfile?.city ?? "");
  const [country, setCountry] = useState(providerProfile?.country ?? "Mexico");
  const [description, setDescription] = useState(providerProfile?.description ?? "");
  const [helpsWith, setHelpsWith] = useState<string[]>(providerProfile?.helpsWith ?? []);

  useEffect(() => {
    if (!user) navigate("/auth?role=provider", { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const toggleStep = (id: string) =>
    setHelpsWith((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim() || !description.trim() || helpsWith.length === 0) return;
    setRole("provider");
    saveProviderProfile({ name: name.trim(), kind, isAI, city: city.trim(), country, description: description.trim(), helpsWith });
    navigate("/proveedor/panel");
  };

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 640 }}>
      <div className="stack" style={{ gap: 4 }}>
        <h1>{providerProfile ? "Edita tu perfil de proveedor" : "Regístrate como proveedor"}</h1>
        <p>Apareces frente a emprendedores exactamente cuando llegan al paso en el que tu servicio ayuda. Nada de anuncios genéricos.</p>
      </div>

      <form className="card stack" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="pname">Nombre profesional o del despacho</label>
          <input id="pname" required placeholder="Ej. Contadora Elena Ruiz" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="pkind">Tipo de servicio</label>
            <select id="pkind" value={kind} onChange={(e) => setKind(e.target.value as ProviderKind)}>
              {kinds.map((k) => (
                <option key={k} value={k}>{providerKindLabel[k]}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="pcountry">País</label>
            <select id="pcountry" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="Mexico">México</option>
              <option value="Colombia">Colombia</option>
              <option value="Argentina">Argentina</option>
              <option value="Chile">Chile</option>
              <option value="Peru">Perú</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="pcity">Ciudad donde atiendes</label>
          <input id="pcity" required placeholder="Ej. Ciudad de México" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>

        <label className="privacy-option" style={{ alignItems: "center" }}>
          <input type="checkbox" checked={isAI} onChange={(e) => setIsAI(e.target.checked)} />
          <span><strong>Este servicio lo presta un agente de IA</strong><small>Se mostrará con esa etiqueta. Los emprendedores siempre sabrán si hablan con una persona o con un agente.</small></span>
        </label>

        <div className="field">
          <label htmlFor="pdesc">Qué haces y en qué condiciones</label>
          <textarea id="pdesc" rows={3} required placeholder="Ej. Alta en el SAT y elección de régimen para negocios que empiezan. Primera consulta sin costo." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <fieldset className="privacy-choice">
          <legend>Pasos de la ruta en los que ayudas</legend>
          <p>Elige al menos uno. Es lo que decide cuándo te sugerimos.</p>
          {roadmapSteps.map((step) => (
            <label key={step.id} className={`privacy-option${helpsWith.includes(step.id) ? " selected" : ""}`}>
              <input type="checkbox" checked={helpsWith.includes(step.id)} onChange={() => toggleStep(step.id)} />
              <span><strong>{step.title}</strong><small>{step.description}</small></span>
            </label>
          ))}
        </fieldset>

        <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={helpsWith.length === 0}>
          {providerProfile ? "Guardar cambios" : "Publicar mi perfil"}
        </button>
      </form>
    </div>
  );
}
