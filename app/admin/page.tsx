import { requireCloudflareUser } from "@/app/cloudflare-auth";
import { isAdmin, readContent } from "@/lib/content";
import AdminEditor from "./editor";
export const dynamic = "force-dynamic";
export const metadata = { title: "Administrar — Midnigh7 Club", robots: { index: false, follow: false } };
export default async function AdminPage() {
  await requireCloudflareUser("/admin");
  if (!await isAdmin()) return <main className="admin-shell"><a className="brand" href="/"><img src="/images/logo.png" alt="Midnigh7 Club" width="210" height="48" /></a><h1>Acesso restrito</h1><p className="admin-intro">Este painel está disponível apenas para a conta responsável pelo site.</p><a className="button button-outline" href="/">Voltar ao clube</a></main>;
  const { content, available } = await readContent();
  return <AdminEditor initial={content} available={available} />;
}
