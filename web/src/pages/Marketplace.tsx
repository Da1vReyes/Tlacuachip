import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { providerKindLabel } from "../lib/matching";
import { useApp } from "../context/AppContext";

export default function Marketplace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { catalogProviders: providers, contactProvider, businessForm } = useApp();
  const requestedProviderId = (location.state as { contactProviderId?: string } | null)?.contactProviderId;
  const [contacting, setContacting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!requestedProviderId || !providers.some((provider) => provider.id === requestedProviderId)) return;
    setContacting(requestedProviderId);
    setMessage((current) => current || `Hola, me gustaría conocer cómo podrías ayudarme con ${businessForm?.businessType ?? "mi negocio"}.`);
  }, [requestedProviderId, providers, businessForm?.businessType]);

  const orderedProviders = useMemo(() => requestedProviderId ? [...providers].sort((a, b) => Number(b.id === requestedProviderId) - Number(a.id === requestedProviderId)) : providers, [providers, requestedProviderId]);

  const send = async (providerId: string) => {
    try { await contactProvider(providerId, message); setNotice("Solicitud enviada. La conversación se abre cuando la otra persona la acepte."); setContacting(null); setMessage(""); }
    catch (err) { setNotice(err instanceof Error ? err.message : "No se pudo enviar el mensaje."); }
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div className="stack" style={{ gap: 4 }}>
          <h1>Personas para hacer avanzar tu negocio</h1>
          <p>Explora la red completa o empieza por <button className="btn btn-ghost" style={{ padding: 0, fontSize: "inherit" }} onClick={() => navigate("/equipo")}>quién puede ayudarte ahora</button>.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/auth?role=provider")}>
          Registrarme como proveedor
        </button>
      </div>

      {notice && <p className="muted" role="status">{notice}</p>}
      {providers.length === 0 && <div className="card stack" style={{ gap: 8 }}><h2>La red se está formando</h2><p>Aún no hay perfiles reales disponibles para contacto. Invita a un contador, abogado o proveedor a crear su perfil para que aparezca aquí.</p><button className="btn btn-primary" onClick={() => navigate("/auth?role=provider")}>Invitar a un proveedor</button></div>}

      <div className="grid-3">
        {orderedProviders.map((p) => (
          <div key={p.id} className="card stack" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div className="row" style={{ gap: 8, alignItems: "center" }}><span className="topbar-avatar" style={{ width: 34, height: 34 }}>{p.name.charAt(0)}</span><span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span></div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span className="pill">{providerKindLabel[p.kind]}</span>
                {p.isAI && <span className="pill pill-warn">Agente de IA</span>}
              </div>
            </div>
            <p>{p.description}</p>
            <span className="muted">{p.location}</span>
            {contacting === p.id ? <div className="stack" style={{ gap: 8 }}><strong style={{ fontSize: 13 }}>Escribe tu solicitud para {p.name}</strong><textarea rows={3} maxLength={1200} placeholder="Explica qué necesitas y en qué paso estás…" value={message} onChange={(event) => setMessage(event.target.value)} /><div className="row" style={{ gap: 8 }}><button className="btn btn-primary" disabled={!message.trim()} onClick={() => send(p.id)}>Enviar solicitud</button><button className="btn btn-ghost" onClick={() => setContacting(null)}>Cancelar</button></div></div> : <button className="btn btn-secondary" onClick={() => { setContacting(p.id); setNotice(null); }}>Contactar</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
