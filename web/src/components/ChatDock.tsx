import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Conversation } from "../lib/userApi";
import { IconChat } from "./icons";

export default function ChatDock() {
  const { user, getConversations, sendConversationMessage, acceptConversation, inviteToTeam, acceptTeamInvite } = useApp();
  const [items, setItems] = useState<Conversation[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await getConversations();
      setItems(rows);
      setSelectedId((current) => current ?? rows.find((row) => row.status === "accepted")?.id ?? rows[0]?.id ?? null);
    } catch { /* The full inbox retains the error state; the dock stays quiet. */ }
  }, [user, getConversations]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(id);
  }, [load]);

  const active = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const pendingForMe = items.filter((item) => item.status === "pending" && item.request);
  const accept = async (id: string) => { setBusy(true); try { await acceptConversation(id); await load(); setSelectedId(id); } finally { setBusy(false); } };
  const invite = async (id: string) => { setBusy(true); try { await inviteToTeam(id); await load(); } finally { setBusy(false); } };
  const acceptInvite = async (id: string) => { setBusy(true); try { await acceptTeamInvite(id); await load(); } finally { setBusy(false); } };
  const send = async () => { if (!active || active.status !== "accepted" || !draft.trim()) return; setBusy(true); try { await sendConversationMessage(active.id, draft); setDraft(""); await load(); } finally { setBusy(false); } };
  if (!user) return null;

  return <div className="chat-dock">
    {open && <section className="chat-dock-panel" aria-label="Mensajes rápidos">
      <header><strong>Mensajes</strong><button className="btn btn-ghost" aria-label="Cerrar mensajes" onClick={() => setOpen(false)}>×</button></header>
      {pendingForMe.map((item) => <div className="chat-request" key={item.id}><span>Alguien quiere conocerte</span><strong>{item.request?.category ?? "Emprendimiento"}{item.request?.city ? ` · ${item.request.city}` : ""}</strong><small>Solo verás el mensaje al aceptar.</small><button className="btn btn-primary" disabled={busy} onClick={() => accept(item.id)}>Aceptar solicitud</button></div>)}
      <div className="chat-thread-tabs">{items.filter((item) => item.status === "accepted").map((item) => <button key={item.id} className={item.id === active?.id ? "active" : ""} onClick={() => setSelectedId(item.id)}>{item.counterpart.name}</button>)}</div>
      {active?.status === "pending" && !active.request && <p className="chat-empty">Solicitud enviada. La otra persona decidirá si abre el chat.</p>}
      {active?.status === "accepted" && <>
        <div className="chat-messages">{active.messages.map((message) => <p key={message.id} className={message.sentByMe ? "mine" : "theirs"}>{message.body}</p>)}</div>
        {active.teamStatus === "active" && <p className="chat-empty">Colaboración activa. El trabajo y los archivos están en <a href="#/equipo">Tu equipo</a>.</p>}
        {active.counterpart.role === "provider" && active.teamStatus === "none" && <button className="btn btn-secondary" disabled={busy} onClick={() => invite(active.id)}>Invitar a mi equipo</button>}
        {active.counterpart.role === "provider" && active.teamStatus === "invited" && <p className="chat-empty">Invitación enviada. La profesional debe aceptarla.</p>}
        {active.counterpart.role === "entrepreneur" && active.teamStatus === "invited" && <div className="chat-request"><strong>Te invitaron a colaborar</strong><small>Al aceptar, podrás compartir entregables y tareas con esta persona.</small><button className="btn btn-primary" disabled={busy} onClick={() => acceptInvite(active.id)}>Aceptar colaboración</button></div>}
        <div className="chat-compose"><textarea aria-label="Escribir mensaje" rows={2} maxLength={1200} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escribe un mensaje…" /><button className="btn btn-primary" disabled={busy || !draft.trim()} onClick={send}>Enviar</button></div>
      </>}
      {items.length === 0 && <p className="chat-empty">Cuando contactes a un profesional, la conversación aparecerá aquí.</p>}
    </section>}
    <button className="chat-dock-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}><IconChat size={18} /> Mensajes{pendingForMe.length > 0 && <span>{pendingForMe.length}</span>}</button>
  </div>;
}
