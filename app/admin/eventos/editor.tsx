"use client";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, RefreshCw, Trash2 } from "lucide-react";
import type { AutoEvent } from "@/lib/events";

export default function EventsEditor({ initial, available }: { initial: AutoEvent[]; available: boolean }) {
  const [events, setEvents] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);

  async function refresh() {
    setBusy(true); setError(false); setFeedback("Buscando notícias… isso pode levar cerca de um minuto.");
    try {
      const response = await fetch("/api/content/events", { method: "POST" });
      const data = await response.json() as { found?: number; added?: number; scanned?: number; feedsOk?: number; feedsFailed?: number; lastError?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar agora.");
      const next = await fetch("/api/content/events", { cache: "no-store" }).then(r => r.json() as Promise<{ events: AutoEvent[] }>);
      setEvents(next.events);
      const failed = data.feedsFailed ? ` ${data.feedsFailed} de ${(data.feedsOk ?? 0) + data.feedsFailed} buscas falharam (${data.lastError}).` : "";
      setError(!data.feedsOk);
      setFeedback(`Atualização concluída: ${data.scanned ?? 0} notícias analisadas, ${data.added ?? 0} novas adicionadas.${failed}`);
    } catch (e) {
      setError(true); setFeedback(e instanceof Error ? e.message : "Não foi possível atualizar agora.");
    } finally { setBusy(false); }
  }

  async function remove(event: AutoEvent) {
    if (!window.confirm(`Excluir "${event.title}"?`)) return;
    setBusy(true); setError(false);
    try {
      const response = await fetch(`/api/content/events?id=${event.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Não foi possível excluir agora.");
      setEvents(current => current.filter(item => item.id !== event.id));
      setFeedback("Evento excluído.");
    } catch (e) {
      setError(true); setFeedback(e instanceof Error ? e.message : "Não foi possível excluir agora.");
    } finally { setBusy(false); }
  }

  return <main className="admin-shell"><div className="admin-top"><a className="brand" href="/"><img src="/images/logo.png" alt="Midnigh7 Club" width={210} height={48} /></a><a className="text-link" href="/admin"><ArrowLeft size={16} />Voltar ao painel</a></div><p className="eyebrow">PAINEL DO CLUBE</p><h1>Eventos</h1><p className="admin-intro">As notícias são coletadas automaticamente nos dias 1 e 15 de cada mês. Use o botão para buscar agora, ou exclua o que não fizer sentido. Página pública: <a href="/eventos" target="_blank" rel="noopener noreferrer">/eventos</a>.</p>
    <section className="admin-panel"><h2>Atualização</h2><p>Busca novas notícias de eventos automotivos nas cidades do interior de SP.</p><div className="admin-actions"><p className={`admin-feedback ${error ? "admin-error" : ""}`} role="status" aria-live="polite">{feedback || (available ? "Pronto." : "Banco de dados indisponível.")}</p><button className="button button-gold" type="button" disabled={busy || !available} onClick={() => void refresh()}><RefreshCw size={18} />{busy ? "Aguarde…" : "Atualizar agora"}</button></div></section>
    <section className="admin-panel"><h2>Eventos publicados ({events.length})</h2>{events.length ? <div className="admin-partner-list">{events.map(event => <div className="admin-partner-item" key={event.id}><div className="admin-partner-info"><h3>{event.title}</h3><p>{event.city} · {event.source}</p><a className="admin-small" href={event.url} target="_blank" rel="noopener noreferrer">Abrir fonte <ArrowUpRight size={13} style={{ display: "inline" }} /></a></div><div className="admin-partner-buttons"><button className="button button-outline admin-danger" type="button" disabled={busy} onClick={() => void remove(event)}><Trash2 size={16} />Excluir</button></div></div>)}</div> : <p className="admin-small" style={{ marginTop: 16 }}>Nenhum evento ainda. Clique em "Atualizar agora".</p>}</section>
  </main>;
}
