import { ArrowLeft, ArrowUpRight, Wrench } from "lucide-react";

export default function RoupasMaintenance({ instagram }: { instagram: string }) {
  return (
    <>
      <header className="header">
        <div className="nav-wrap">
          <a className="brand" href="/" aria-label="Voltar para o Midnigh7 Club">
            <img src="/images/logo.png" alt="Midnigh7 Club" width={220} height={50} />
          </a>
          <a className="text-link" href="/"><ArrowLeft size={16} />Voltar ao clube</a>
        </div>
      </header>
      <main className="maintenance-shell">
        <div className="maintenance-card">
          <span className="maintenance-icon" aria-hidden="true"><Wrench size={28} /></span>
          <p className="eyebrow"><span className="gold-line" />LOJA DO CLUBE</p>
          <h1>Estamos preparando tudo pra você!</h1>
          <p className="maintenance-copy">A loja de roupas está em manutenção no momento. Volte em breve para conferir as novidades.</p>
          <a className="button button-gold" href={instagram} target="_blank" rel="noopener noreferrer">
            Acompanhar no Instagram<ArrowUpRight size={19} />
          </a>
        </div>
      </main>
    </>
  );
}
