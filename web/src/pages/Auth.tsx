import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Auth() {
  const navigate = useNavigate();
  const { login, businessForm } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    login(email, name || undefined);
    navigate(businessForm ? "/reporte" : "/formulario");
  };

  return (
    <div className="auth-page">
    <div className="auth-card">
      <div className="stack" style={{ gap: 4 }}>
        <h1>{mode === "signup" ? "Crea tu cuenta" : "Bienvenido de vuelta"}</h1>
        <p>Guarda tu progreso y accede a tu reporte cuando quieras.</p>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <div className="field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            required
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" required placeholder="••••••••" />
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
          {mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
        </button>
      </form>

      <button
        className="btn btn-ghost"
        onClick={() => setMode(mode === "signup" ? "login" : "signup")}
      >
        {mode === "signup" ? "¿Ya tienes cuenta? Inicia sesión" : "¿Nuevo aquí? Crea una cuenta"}
      </button>
    </div>
    </div>
  );
}
