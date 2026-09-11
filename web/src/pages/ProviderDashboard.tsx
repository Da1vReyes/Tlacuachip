import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { providerKindLabel } from "../lib/matching";
import { IconCheck } from "../components/icons";
import type { Workspace } from "../lib/userApi";

function readCsv(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");
      resolve(comma >= 0 ? value.slice(comma + 1) : "");
    };
    reader.readAsDataURL(file);
  });
}

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user, providerProfile, steps: roadmapSteps, getWorkspace, createWorkspaceItem, uploadWorkspaceCsv } = useApp();
  const [workspace, setWorkspace] = useState<Workspace[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadWorkspace = async () => {
    try {
      const rows = await getWorkspace();
      setWorkspace(rows);
      setSelectedWorkspace((current) => current || rows[0]?.conversationId || "");
    } catch { setNotice("No se pudo cargar las colaboraciones activas."); }
  };

  useEffect(() => {
    if (!user) navigate("/auth?role=provider", { replace: true });
    else if (!providerProfile) navigate("/proveedor/nuevo", { replace: true });
  }, [user, providerProfile, navigate]);

  useEffect(() => { if (user) void loadWorkspace(); }, [user]); // provider's active collaborations only

  if (!user || !providerProfile) return null;

  const matchedSteps = roadmapSteps.filter((s) => providerProfile.helpsWith.includes(s.id));
  const defaultTitle = providerProfile.kind === "contador" ? "Plan fiscal inicial" : "Primer plan de trabajo";
  const addTask = async () => {
    if (!selectedWorkspace || !(title || defaultTitle).trim()) return;
    setBusy(true); setNotice(null);
    try {
      await createWorkspaceItem(selectedWorkspace, { title: title.trim() || defaultTitle, description: description.trim() || undefined, dueDate: dueDate || undefined });
      setTitle(""); setDescription(""); setDueDate("");
      await loadWorkspace();
      setNotice("Tarea compartida con el emprendedor.");
    } catch (err) { setNotice(err instanceof Error ? err.message : "No se pudo crear la tarea."); }
    finally { setBusy(false); }
  };
  const uploadCsv = async (file: File | undefined) => {
    if (!file || !selectedWorkspace) return;
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 250_000) { setNotice("Usa un CSV de hasta 250 KB."); return; }
    setBusy(true); setNotice(null);
    try {
      await uploadWorkspaceCsv(selectedWorkspace, { name: file.name, contentBase64: await readCsv(file) });
      await loadWorkspace();
      setNotice(`${file.name} ya está disponible para el emprendedor.`);
    } catch (err) { setNotice(err instanceof Error ? err.message : "No se pudo subir el CSV."); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 4 }}>
        <span className="pill">{providerKindLabel[providerProfile.kind]}{providerProfile.isAI ? " · Agente de IA" : ""}</span>
        <h1>Hola, {providerProfile.name}</h1>
        <p>Así funciona tu presencia en la red: apareces cuando un emprendedor tiene pendiente un paso en el que tú ayudas.</p>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card stack" style={{ gap: 10 }}>
          <h2>Así te ven los emprendedores</h2>
          <div className="stack" style={{ gap: 6, paddingTop: 6, borderTop: "1px solid var(--mainBorder)" }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <strong style={{ fontSize: 14 }}>{providerProfile.name}</strong>
              <span className="pill">{providerKindLabel[providerProfile.kind]}</span>
            </div>
            <p>{providerProfile.description}</p>
            <span className="muted">{providerProfile.city}, {providerProfile.country === "Mexico" ? "México" : providerProfile.country}</span>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate("/proveedor/nuevo")}>Editar perfil</button>
        </div>

        <div className="card stack" style={{ gap: 10 }}>
          <h2>Cuándo apareces</h2>
          <p className="muted" style={{ fontSize: 13 }}>Cada vez que un emprendedor llega a uno de estos pasos, tu perfil entra en su equipo recomendado.</p>
          <div className="stack" style={{ gap: 8 }}>
            {matchedSteps.map((s) => (
              <div key={s.id} className="row" style={{ alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "var(--success)", marginTop: 2 }}><IconCheck size={14} /></span>
                <div className="stack" style={{ gap: 1 }}>
                  <strong style={{ fontSize: 13 }}>{s.title}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{s.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <h2>Solicitudes</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Las personas que te escriben llegan a tu bandeja. Sus datos no se adjuntan automáticamente: verás únicamente lo que decidan poner en el mensaje.
        </p>
        <button className="btn btn-primary" style={{ width: "fit-content" }} onClick={() => navigate("/mensajes")}>Abrir mensajes</button>
      </div>

      <section className="card stack" style={{ gap: 14 }}>
        <div className="stack" style={{ gap: 3 }}>
          <h2>Trabajo compartido</h2>
          <p className="muted" style={{ fontSize: 13 }}>Cuando un emprendedor acepta colaborar contigo, aquí puedes convertir la conversación en entregables concretos. Para este piloto, los archivos admitidos son CSV de hasta 250 KB.</p>
        </div>
        {workspace.length === 0 ? <p className="muted">Todavía no tienes colaboraciones activas. Acepta una solicitud y luego la invitación al equipo desde Mensajes.</p> : <>
          <label className="field"><span>Colaboración</span><select value={selectedWorkspace} onChange={(event) => setSelectedWorkspace(event.target.value)}>{workspace.map((space) => <option key={space.conversationId} value={space.conversationId}>{space.collaborator.name}</option>)}</select></label>
          <div className="grid-2">
            <label className="field"><span>Tarea</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={defaultTitle} maxLength={160} /></label>
            <label className="field"><span>Fecha objetivo</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          </div>
          <label className="field"><span>Contexto para el emprendedor</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={800} placeholder="Qué debe revisar o entregar antes de este paso." /></label>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" disabled={busy} onClick={addTask}>{busy ? "Guardando…" : "Añadir tarea"}</button>
            <label className="btn btn-secondary" style={{ cursor: "pointer" }}>Subir análisis CSV<input type="file" accept=".csv,text/csv" hidden disabled={busy} onChange={(event) => { void uploadCsv(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
          </div>
          {notice && <p className="muted" style={{ fontSize: 13 }}>{notice}</p>}
        </>}
      </section>

      <div className="card stack" style={{ gap: 8 }}>
        <h2>Cómo se sostiene Tlacuachic</h2>
        <p className="muted" style={{ fontSize: 13 }}>Durante el prototipo no hay suscripción ni comisión. Cuando existan, serán las únicas dos fuentes de ingreso: una suscripción para proveedores por aparecer en la red y una comisión por acuerdo cerrado dentro de la plataforma. Los datos de los usuarios nunca se venden ni se usan para publicidad.</p>
      </div>
    </div>
  );
}
