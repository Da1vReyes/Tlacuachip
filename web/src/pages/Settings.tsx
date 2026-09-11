import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import type { ProfileVisibility } from "../types";

const visibility: { value: ProfileVisibility; title: string; text: string }[] = [
  { value: "private", title: "Privado", text: "No apareces en búsquedas de mentores, proveedores o comunidad." },
  { value: "business", title: "Datos clave del negocio", text: "Compartes giro, ciudad y etapa; nunca tu correo ni presupuesto exacto." },
  { value: "profile", title: "Perfil completo", text: "Mentores y proveedores pueden conocer tu perfil para ofrecer ayuda relevante." },
];

export default function Settings() {
  const navigate = useNavigate();
  const { preferences, savePreferences, deleteAllData } = useApp();
  const removeEverything = () => {
    if (window.confirm("¿Eliminar tu perfil, negocio, progreso y preferencias de este dispositivo? Esta acción no se puede deshacer.")) {
      deleteAllData();
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-heading"><h1>Datos y privacidad</h1><p>Tu perfil te pertenece. Decide qué compartes y elimina lo que ya no quieres conservar.</p></div>
      <section className="settings-section">
        <h2>Visibilidad para mentores y proveedores</h2>
        <p>Esto controla lo que otras personas pueden ver cuando buscan negocios a quienes ayudar.</p>
        <div className="privacy-list">
          {visibility.map((option) => (
            <label className={`privacy-option${preferences.visibility === option.value ? " selected" : ""}`} key={option.value}>
              <input type="radio" name="setting-visibility" checked={preferences.visibility === option.value} onChange={() => savePreferences({ visibility: option.value })} />
              <span><strong>{option.title}</strong><small>{option.text}</small></span>
            </label>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <h2>Ubicación compartida</h2>
        <p>Tu dirección exacta nunca se comparte. Elige el detalle máximo que la red puede ver.</p>
        <div className="privacy-list inline-options">
          <label className={`privacy-option${preferences.locationPrecision === "city" ? " selected" : ""}`}><input type="radio" name="precision" checked={preferences.locationPrecision === "city"} onChange={() => savePreferences({ locationPrecision: "city" })} /><span><strong>Solo ciudad</strong><small>Recomendado</small></span></label>
          <label className={`privacy-option${preferences.locationPrecision === "zone" ? " selected" : ""}`}><input type="radio" name="precision" checked={preferences.locationPrecision === "zone"} onChange={() => savePreferences({ locationPrecision: "zone" })} /><span><strong>Zona aproximada</strong><small>Sin dirección</small></span></label>
        </div>
      </section>
      <section className="settings-section danger-zone">
        <h2>Eliminar mis datos</h2>
        <p>Elimina tu perfil, los datos de negocio, el roadmap y preferencias guardadas en este dispositivo.</p>
        <button className="btn btn-secondary" onClick={removeEverything}>Eliminar todo mi registro</button>
      </section>
    </div>
  );
}
