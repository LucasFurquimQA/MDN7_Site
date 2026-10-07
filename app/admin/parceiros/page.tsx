import { isAdmin } from "@/lib/content";
import { listPartners } from "@/lib/partners";
import PartnersEditor from "./editor";
export const dynamic = "force-dynamic";
export const metadata = { title: "Parceiros — Midnigh7 Club", robots: { index: false, follow: false } };
export default async function AdminPartnersPage() {
  if (!await isAdmin()) return <main className="admin-shell"><a className="brand" href="/"><img src="/images/logo.png" alt="Midnigh7 Club" width="210" height="48" /></a><h1>Acesso restrito</h1><p className="admin-intro">Este painel está disponível apenas para a conta responsável pelo site.</p><a className="button button-outline" href="/">Voltar ao clube</a></main>;
  const { partners, available } = await listPartners();
  return <PartnersEditor initial={partners} available={available} />;
}
