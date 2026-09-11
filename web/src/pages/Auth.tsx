import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { IconRoute, IconUsers } from "../components/icons";
import type { UserRole } from "../types";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signup, login, preferences, savePreferences, user } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [role, setRole] = useState<UserRole>(params.get("role") === "provider" ? "provider" : user?.role ?? "entrepreneur");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      let result;
      if (mode === "signup") {
        if (password.length < 8) {
          setError("La contraseña debe tener al menos 8 caracteres.");
          setSubmitting(false);
          return;
        }
        result = await signup(email, password, name || undefined, role);
      } else {
        result = await login(email, password);
      }
      if (result.role === "provider") {
        navigate(result.hasProviderProfile ? "/proveedor/panel" : "/proveedor/nuevo");
        return;
      }
      navigate(result.hasBusinessForm ? (result.onboardingComplete ? "/dashboard" : "/onboarding/mapa") : "/formulario");
    } catch (err) {
      setError(
        err instanceof Error
          ? mode === "signup"
            ? err.message.includes("email_taken") || err.message.toLowerCase().includes("exists")
              ? "Ya existe una cuenta con este correo. Intenta iniciar sesión."
              : err.message
            : err.message
          : "Algo salió mal"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="stack" style={{ gap: 4 }}>
          <h1>{mode === "signup" ? "Crea tu cuenta" : "Bienvenido de vuelta"}</h1>
          <p>{mode === "signup" ? "Primero dinos desde qué lado entras a la red." : "Guarda tu progreso y accede a tu reporte cuando quieras."}</p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="role-grid" role="radiogroup" aria-label="Tipo de cuenta">
            <button type="button" className={`role-card${role === "entrepreneur" ? " selected" : ""}`} onClick={() => setRole("entrepreneur")} aria-pressed={role === "entrepreneur"}>
              <IconRoute size={18} />
              <strong>Quiero emprender</strong>
              <small>Leer mi zona, seguir la ruta de formalización y armar mi equipo.</small>
            </button>
            <button type="button" className={`role-card${role === "provider" ? " selected" : ""}`} onClick={() => setRole("provider")} aria-pressed={role === "provider"}>
              <IconUsers size={18} />
              <strong>Ofrezco servicios</strong>
              <small>Abogado, contador, asesor, marketing, gestoría o insumos. Que me encuentren cuando me necesiten.</small>
            </button>
          </div>

          {mode === "signup" && (
            <div className="field">
              <label htmlFor="name">Nombre</label>
              <input id="name" type="text" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" required placeholder="tucorreo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {mode === "signup" && role === "entrepreneur" && (
            <fieldset className="privacy-choice">
              <legend>Tu privacidad en la red</legend>
              <p>La compartición se puede cambiar o eliminar por completo desde Configuración.</p>
              <label className={`privacy-option${preferences.visibility === "business" ? " selected" : ""}`}>
                <input type="radio" name="visibility" checked={preferences.visibility === "business"} onChange={() => savePreferences({ visibility: "business" })} />
                <span><strong>Solo datos clave del negocio</strong><small>Giro, ciudad y etapa. Recomendado para encontrar apoyo sin exponer tu perfil.</small></span>
              </label>
              <label className={`privacy-option${preferences.visibility === "profile" ? " selected" : ""}`}>
                <input type="radio" name="visibility" checked={preferences.visibility === "profile"} onChange={() => savePreferences({ visibility: "profile" })} />
                <span><strong>Perfil completo para la red</strong><small>Permite que mentores y proveedores te contacten con contexto.</small></span>
              </label>
              <label className={`privacy-option${preferences.visibility === "private" ? " selected" : ""}`}>
                <input type="radio" name="visibility" checked={preferences.visibility === "private"} onChange={() => savePreferences({ visibility: "private" })} />
                <span><strong>Mantener todo privado</strong><small>Usas Tlacuachic sin aparecer en búsquedas de la comunidad.</small></span>
              </label>
            </fieldset>
          )}

          {mode === "signup" && role === "provider" && (
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              Tu perfil de proveedor es público por diseño: existe para que te encuentren. Solo se muestra lo que escribas en él; tu correo nunca se publica.
            </p>
          )}

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "signup" && <span className="muted" style={{ fontSize: 11.5 }}>Mínimo 8 caracteres.</span>}
          </div>

          {error && <span className="muted" style={{ color: "var(--warn)", fontSize: 12.5 }}>{error}</span>}

          <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={submitting}>
            {submitting ? "Un momento…" : mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
          </button>
        </form>

        <button className="btn btn-ghost" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}>
          {mode === "signup" ? "¿Ya tienes cuenta? Inicia sesión" : "¿Nuevo aquí? Crea una cuenta"}
        </button>
      </div>
    </div>
  );
}
