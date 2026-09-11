import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Conversation } from "../lib/userApi";

export default function Inbox() {
  const { getConversations, sendConversationMessage } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await getConversations();
      setConversations(rows);
      setSelectedId((previous) => previous ?? rows[0]?.id ?? null);
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudieron cargar tus mensajes."); }
    finally { setLoading(false); }
  }, [getConversations]);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(poll);
  }, [load]);

  const active = useMemo(() => conversations.find((item) => item.id === selectedId) ?? null, [conversations, selectedId]);
  const send = async () => {
    if (!active || !draft.trim()) return;
    try {
      await sendConversationMessage(active.id, draft);
      setDraft("");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje."); }
  };

  return <div className="stack" style={{ gap: 18 }}>
    <div><h1>Mensajes</h1><p>Solo compartes información adicional si decides escribirla. Tu correo, dirección y presupuesto exacto nunca se adjuntan automáticamente.</p></div>
    {error && <p className="muted" role="status">{error}</p>}
    <div className="grid-2" style={{ alignItems: "stretch" }}>
      <section className="card stack" style={{ gap: 8 }}>
        <h2>Conversaciones</h2>
        {loading && <p className="muted">Cargando…</p>}
        {!loading && conversations.length === 0 && <p className="muted">Aún no tienes mensajes. Encuentra ayuda en Marketplace o Tu equipo.</p>}
        {conversations.map((item) => <button key={item.id} className={`btn ${item.id === active?.id ? "btn-secondary" : "btn-ghost"}`} style={{ justifyContent: "space-between", textAlign: "left" }} onClick={() => setSelectedId(item.id)}><span>{item.counterpart.name}</span><small>{item.counterpart.role === "provider" ? "Proveedor" : "Emprendedor/a"}</small></button>)}
      </section>
      <section className="card stack" style={{ minHeight: 360, gap: 10 }}>
        {!active ? <><h2>Elige una conversación</h2><p className="muted">Cuando contactes un proveedor, el hilo aparecerá aquí.</p></> : <><div><h2>{active.counterpart.name}</h2><p className="muted">{active.counterpart.role === "provider" ? "Proveedor" : "Emprendedor/a"} · actualización automática cada 15 segundos</p></div><div className="stack" style={{ gap: 8, flex: 1 }}>{active.messages.map((message) => <div key={message.id} className="card" style={{ marginLeft: message.sentByMe ? "12%" : 0, marginRight: message.sentByMe ? 0 : "12%", background: message.sentByMe ? "var(--accentSoft)" : undefined }}><p>{message.body}</p><small className="muted">{new Date(message.createdAt).toLocaleString("es-MX")}</small></div>)}</div><div className="stack" style={{ gap: 8 }}><textarea rows={3} maxLength={1200} placeholder="Escribe solo lo que deseas compartir…" value={draft} onChange={(event) => setDraft(event.target.value)} /><button className="btn btn-primary" disabled={!draft.trim()} onClick={send}>Enviar mensaje</button></div></>}
      </section>
    </div>
  </div>;
}
