"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Download, Save } from "lucide-react";
import { ClubContent, instagramUsername, instagramUrl, Member } from "@/lib/club";

export default function AdminEditor({ initial, available, instagramConnected }: { initial: ClubContent; available: boolean; instagramConnected: boolean }) {
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(available ? "" : "Não foi possível carregar o conteúdo salvo. Recarregue a página antes de editar.");
  const [error, setError] = useState(!available);
  const [imports, setImports] = useState<Record<number, { loading: boolean; message: string }>>({});
  const controllers = useRef<Record<number, AbortController>>({});
  const lastImported = useRef<Record<number, string>>(Object.fromEntries(initial.members.map(m => [m.id, instagramUsername(m.instagram) || ""])));
  const currentContent = useRef(content);
  useEffect(() => { currentContent.current = content; }, [content]);
  useEffect(() => { const leave = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave); }, [dirty]);
  useEffect(() => () => { Object.values(controllers.current).forEach(controller => controller.abort()); }, []);
  const update = (patch: Partial<ClubContent>) => { setContent(c => ({ ...c, ...patch })); setDirty(true); setFeedback(""); };
  const updateMember = (id: number, patch: Partial<Member>) => { setContent(c => ({ ...c, members: c.members.map(m => m.id === id ? { ...m, ...patch } : m) })); setDirty(true); setFeedback(""); };
  const updateLink = (member: Member, value: string) => {
    controllers.current[member.id]?.abort();
    const changed = instagramUsername(value) !== member.username;
    updateMember(member.id, { instagram: value, username: instagramUsername(value) || "", ...(changed ? { name: "", bio: "", photo: "" } : {}) });
    setImports(v => ({ ...v, [member.id]: { loading: false, message: "" } }));
  };
  async function importProfile(id: number, link: string, automatic = false) {
    const username = instagramUsername(link);
    if (!link.trim()) return;
    if (!username) { setImports(v => ({ ...v, [id]: { loading: false, message: "Informe um @ ou o link completo de um perfil do Instagram." } })); return; }
    updateMember(id, { instagram: instagramUrl(link), username });
    lastImported.current[id] = username;
    if (!instagramConnected && automatic) { setImports(v => ({ ...v, [id]: { loading: false, message: `@${username} identificado. Foto, nome e descrição podem ser preenchidos abaixo.` } })); return; }
    controllers.current[id]?.abort();
    const controller = new AbortController(); controllers.current[id] = controller;
    setImports(v => ({ ...v, [id]: { loading: true, message: "Consultando o Instagram…" } }));
    try {
      const response = await fetch("/api/instagram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instagram: link }), signal: controller.signal });
      const data = await response.json() as { error?: string; profile?: Pick<Member, "username" | "name" | "bio" | "photo"> };
      if (instagramUsername(currentContent.current.members.find(m => m.id === id)?.instagram || "") !== username) return;
      if (!response.ok || !data.profile) throw new Error(data.error || "Perfil indisponível.");
      updateMember(id, { ...data.profile, instagram: instagramUrl(link) });
      setImports(v => ({ ...v, [id]: { loading: false, message: "Perfil importado. Confira os dados e salve as alterações." } }));
    } catch (e) {
      if (controller.signal.aborted) return;
      setImports(v => ({ ...v, [id]: { loading: false, message: e instanceof Error ? e.message : "Não foi possível importar o perfil." } }));
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (saving || !available) return;
    setSaving(true); setFeedback(""); setError(false);
    try {
      const response = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) });
      const data = await response.json() as { error?: string; content?: ClubContent };
      if (!response.ok || !data.content) throw new Error(data.error || "Não foi possível salvar.");
      setContent(data.content); setDirty(false); setFeedback("Alterações salvas. O site já está atualizado.");
    } catch (e) { setError(true); setFeedback(e instanceof Error ? e.message : "Não foi possível salvar. Tente novamente."); } finally { setSaving(false); }
  }
  return <main className="admin-shell"><div className="admin-top"><a className="brand" href="/"><img src="/images/logo.png" alt="Midnigh7 Club" width={210} height={48} /></a><a className="text-link" href="/"><ArrowLeft size={16} />Voltar ao site</a></div><p className="eyebrow">PAINEL DO CLUBE</p><h1>O clube, do seu jeito.</h1><p className="admin-intro">Atualize a história, o Instagram oficial e os sete administradores. As alterações aparecem no site depois de salvar.</p><form onSubmit={save}><fieldset disabled={saving || !available} style={{ border: 0, margin: 0, padding: 0 }}><section className="admin-panel"><h2>O grupo</h2><label className="admin-field">Instagram oficial<input value={content.instagram} maxLength={255} required onChange={e => update({ instagram: e.target.value })} placeholder="https://www.instagram.com/seu.perfil/" /><small>Este endereço será usado nos botões de participação e de camisetas.</small></label><label className="admin-field">Nossa história<textarea rows={8} value={content.story} minLength={10} maxLength={8000} required onChange={e => update({ story: e.target.value })} /></label></section><section className="admin-panel"><h2>Os sete administradores</h2><p>Cole o link de cada Instagram para identificar o @. {instagramConnected ? "Os perfis compatíveis serão importados automaticamente ao sair do campo." : "A importação automática de foto, nome e bio ainda precisa da conexão autorizada com a Meta. Por enquanto, preencha esses dados nos campos abaixo."}</p>{content.members.map(member => <div className="admin-member" key={member.id}><h3>Administrador {String(member.id).padStart(2, "0")}</h3><div className="admin-import-row"><label className="admin-field">Instagram do administrador {member.id}<input value={member.instagram} maxLength={255} onChange={e => updateLink(member, e.target.value)} onBlur={e => { if (e.target.value.trim() && instagramUsername(e.target.value) !== lastImported.current[member.id]) importProfile(member.id, e.target.value, true); }} placeholder="https://www.instagram.com/perfil.do.carro/" /></label><button className="button button-outline" type="button" onClick={() => importProfile(member.id, member.instagram)} disabled={!member.instagram || imports[member.id]?.loading}><Download size={16} />{imports[member.id]?.loading ? "Buscando…" : "Importar perfil"}</button></div>{imports[member.id]?.message && <p className="admin-import-message" role="status">{imports[member.id].message}</p>}<div className="admin-row"><label className="admin-field">Nome de exibição<input value={member.name} maxLength={100} onChange={e => updateMember(member.id, { name: e.target.value })} placeholder="Nome do administrador ou do projeto" /></label><label className="admin-field">Foto de perfil (link HTTPS)<input type="url" value={member.photo} maxLength={4096} onChange={e => updateMember(member.id, { photo: e.target.value })} placeholder="https://…" /></label></div><label className="admin-field">Descrição do perfil<textarea rows={3} value={member.bio} maxLength={400} onChange={e => updateMember(member.id, { bio: e.target.value })} placeholder="A bio ou uma breve descrição do projeto" /></label>{member.username && <p className="admin-small" style={{ marginTop: 16 }}>Perfil: <a href={instagramUrl(member.instagram)} target="_blank" rel="noopener noreferrer">@{member.username} <ArrowUpRight size={13} style={{ display: "inline" }} /></a></p>}</div>)}</section></fieldset><div className="admin-actions"><p className={`admin-feedback ${error ? "admin-error" : ""}`} role="status" aria-live="polite">{feedback || (dirty ? "Você tem alterações para salvar." : "Pronto para editar.")}</p><button className="button button-gold" type="submit" disabled={saving || !available || !dirty || Object.values(imports).some(item => item.loading)}><Save size={18} />{saving ? "Salvando…" : "Salvar alterações"}</button></div></form></main>;
}
