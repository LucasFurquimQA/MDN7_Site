import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { contentDb } from "@/lib/content";
import { EVENT_CITIES, listEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Eventos — Midnigh7 Club",
  description: "Notícias de eventos automotivos nas maiores cidades do interior de São Paulo, atualizadas a cada quinze dias.",
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function EventosPage({ searchParams }: { searchParams: Promise<{ cidade?: string }> }) {
  const { cidade } = await searchParams;
  const city = EVENT_CITIES.includes(cidade ?? "") ? cidade : undefined;
  const { events, available } = await listEvents(contentDb(), city);
  return <>
    <header className="header"><div className="nav-wrap"><a className="brand" href="/" aria-label="Voltar para o Midnigh7 Club"><img src="/images/logo.png" alt="Midnigh7 Club" width={220} height={50} /></a><a className="text-link" href="/"><ArrowLeft size={16} />Voltar ao clube</a></div></header>
    <main className="partners-page"><div className="container">
      <div className="partners-hero"><span className="eyebrow"><span className="gold-line" />EVENTOS / INTERIOR DE SÃO PAULO</span><h1>Para onde <span>ir</span> no fim de semana.</h1><p>Notícias sobre encontros, exposições e competições automotivas nas maiores cidades do interior paulista. Atualizado a cada quinze dias. Cada item leva à matéria original.</p></div>
      <nav className="events-filter" aria-label="Filtrar por cidade"><a href="/eventos" className={!city ? "active" : ""}>Todas</a>{EVENT_CITIES.map(name => <a key={name} href={`/eventos?cidade=${encodeURIComponent(name)}`} className={city === name ? "active" : ""}>{name}</a>)}</nav>
      <div className="section-label"><span className="mono">EVENTOS / {String(events.length).padStart(2, "0")}</span><span className="section-rule" /></div>
      {events.length ? <div className="events-grid">{events.map(event => <a className="event-card" key={event.id} href={event.url} target="_blank" rel="noopener noreferrer nofollow"><span className="event-cover">{event.image ? <img loading="lazy" src={event.image} alt="" referrerPolicy="no-referrer" /> : <CalendarDays size={34} aria-hidden="true" />}</span><div className="event-content"><span className="event-city"><MapPin size={14} />{event.city}</span><h2>{event.title}</h2><span className="event-meta"><span><CalendarDays size={14} />{dateFormat.format(new Date(event.published_at))}</span><span>{event.source}</span></span><span className="event-open">Ler na fonte<ArrowUpRight size={16} /></span></div></a>)}</div> : <div className="partners-empty"><p>{available ? "Ainda não há eventos por aqui. A próxima atualização acontece em breve." : "Não foi possível carregar os eventos agora. Tente novamente em instantes."}</p></div>}
    </div></main>
  </>;
}
