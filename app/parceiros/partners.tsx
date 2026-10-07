import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { instagramUsername, Partner } from "@/lib/club";

function Instagram({ size = 20 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></svg>; }

export default function PartnersPage({ partners, instagram, available }: { partners: Partner[]; instagram: string; available: boolean }) {
  return <>
    <header className="header"><div className="nav-wrap"><a className="brand" href="/" aria-label="Voltar para o Midnigh7 Club"><img src="/images/logo.png" alt="Midnigh7 Club" width={220} height={50} /></a><a className="text-link" href="/"><ArrowLeft size={16} />Voltar ao clube</a><a className="nav-instagram" href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Abrir Instagram do Midnigh7 Club em nova aba"><Instagram size={18} />Instagram<ArrowUpRight size={15} /></a></div></header>
    <main className="partners-page"><div className="container">
      <div className="partners-hero"><span className="eyebrow"><span className="gold-line" />PARCEIROS / QUEM CAMINHA COM A GENTE</span><h1>Marcas que <span>aceleram</span> junto.</h1><p>Empresas e projetos que acreditam na cultura automotiva e apoiam o Midnigh7 Club.</p></div>
      <div className="section-label"><span className="mono">PARCEIROS / {String(partners.length).padStart(2, "0")}</span><span className="section-rule" /></div>
      {partners.length ? <div className="partners-grid">{partners.map(partner => {
        const username = instagramUsername(partner.instagram);
        return <article className="partner-card" key={partner.id}>
          <div className="partner-logo"><img loading="lazy" src={partner.logo} alt={`Logo ${partner.nome}`} /></div>
          <div className="partner-body"><h2>{partner.nome}</h2><p className="partner-description">{partner.descricao}</p>{username && <p className="partner-handle">@{username}</p>}{username && <a className="button button-outline partner-link" href={partner.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Abrir Instagram de ${partner.nome} em nova aba`}><Instagram size={18} />Ver no Instagram<ArrowUpRight size={18} /></a>}</div>
        </article>;
      })}</div> : <div className="partners-empty"><p>{available ? "Em breve, novos parceiros por aqui." : "Não foi possível carregar os parceiros agora. Tente novamente em instantes."}</p></div>}
    </div></main>
  </>;
}
