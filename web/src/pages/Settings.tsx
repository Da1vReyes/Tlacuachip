import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import type { ProfileVisibility } from "../types";

const visibility: { value: ProfileVisibility; title: string; text: string }[] = [
  { value: "private", title: "Privado", text: "En comunidad apareces de forma anónima. La red no recibe automáticamente tu información de negocio." },
  { value: "business", title: "Datos clave del negocio", text: "La IA solo usa giro, ciudad y etapa para priorizar ayuda; correo, dirección y presupuesto exacto siguen privados." },
  { value: "profile", title: "Perfil ampliado", text: "La IA puede usar descripción, experiencia y rango de presupuesto para sugerirte ayuda. Solo compartes con un proveedor lo que escribes en un mensaje." },
];

export default function Settings() {
  const navigate = useNavigate();
  const { preferences, savePreferences, deleteAllData, user, logout, updateAccountProfile } = useApp();
  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [accountStatus, setAccountStatus] = useState<string | null>(null);

  const saveAccount = async () => {
    try {
      await updateAccountProfile({ name: name.trim() || null, avatarUrl: avatarUrl || null });
      setAccountStatus("Perfil actualizado.");
    } catch (err) { setAccountStatus(err instanceof Error ? err.message : "No se pudo actualizar el perfil."); }
  };
  const choosePhoto = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type) || file.size > 80000) { setAccountStatus("Elige una imagen PNG, JPG o WebP de máximo 80 KB."); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };
  const removeEverything = () => {
    if (window.confirm("¿Eliminar tu cuenta y todos tus datos (perfil, negocio, progreso, preferencias) de nuestros servidores? Esta acción no se puede deshacer.")) {
      deleteAllData();
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-heading"><h1>Datos y privacidad</h1><p>Tu perfil te pertenece. Decide qué compartes y elimina lo que ya no quieres conservar.</p></div>
      <section className="settings-section">
        <h2>Tu cuenta</h2>
        <p>Tu foto y nombre se guardan en tu cuenta; no se adjuntan a mensajes ni a solicitudes de ayuda automáticamente.</p>
        <div className="row" style={{ alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div className="topbar-avatar" style={{ width: 48, height: 48 }}>{avatarUrl ? <img src={avatarUrl} alt="Vista previa" /> : (name || user?.email || "A").charAt(0).toUpperCase()}</div>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>Subir foto<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => choosePhoto(event.target.files?.[0])} /></label>
          {avatarUrl && <button className="btn btn-ghost" onClick={() => setAvatarUrl("")}>Quitar foto</button>}
        </div>
        <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}><input aria-label="Tu nombre" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" /><button className="btn btn-primary" onClick={saveAccount}>Guardar perfil</button></div>
        {accountStatus && <small className="muted" role="status">{accountStatus}</small>}
        <div style={{ marginTop: 14 }}><button className="btn btn-secondary" onClick={() => { logout(); navigate("/", { replace: true }); }}>Cerrar sesión</button></div>
      </section>
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
