"use client";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Save } from "lucide-react";
import { ClubContent, instagramUsername, instagramUrl, Member } from "@/lib/club";

export default function AdminEditor({ initial, available }: { initial: ClubContent; available: boolean }) {
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(available ? "" : "Não foi possível carregar o conteúdo salvo. Recarregue a página antes de editar.");
  const [error, setError] = useState(!available);
  const [fileNames, setFileNames] = useState<Record<number, string>>({});
  useEffect(() => { const leave = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave); }, [dirty]);
  const update = (patch: Partial<ClubContent>) => { setContent(c => ({ ...c, ...patch })); setDirty(true); setFeedback(""); };
  const updateMember = (id: number, patch: Partial<Member>) => { setContent(c => ({ ...c, members: c.members.map(m => m.id === id ? { ...m, ...patch } : m) })); setDirty(true); setFeedback(""); };
  async function uploadPhoto(id: number, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback("Selecione um arquivo de imagem válido.");
      return;
    }
    if (file.size > 1_500_000) {
      setFeedback("A foto deve ter no máximo 1,5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setFeedback("Não foi possível ler essa foto.");
        return;
      }
      updateMember(id, { photo: reader.result });
      setFileNames(v => ({ ...v, [id]: file.name }));
      setFeedback("Foto carregada. Salve as alterações para publicar.");
    };
    reader.onerror = () => setFeedback("Não foi possível ler essa foto.");
    reader.readAsDataURL(file);
  }
  const updateLink = (member: Member, value: string) => {
    const changed = instagramUsername(value) !== member.username;
    updateMember(member.id, { instagram: value, username: instagramUsername(value) || "", ...(changed ? { name: "", bio: "", photo: "" } : {}) });
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
  return <main className="admin-shell"><div className="admin-top"><a className="brand" href="/"><img src="/images/logo.png" alt="Midnigh7 Club" width={210} height={48} /></a><a className="text-link" href="/"><ArrowLeft size={16} />Voltar ao site</a></div><p className="eyebrow">PAINEL DO CLUBE</p><h1>O clube, do seu jeito.</h1><p className="admin-intro">Atualize a história, o Instagram oficial e os sete administradores. As alterações aparecem no site depois de salvar.</p><form onSubmit={save}><fieldset disabled={saving || !available} style={{ border: 0, margin: 0, padding: 0 }}><section className="admin-panel"><h2>O grupo</h2><label className="admin-field">Instagram oficial<input value={content.instagram} maxLength={255} required onChange={e => update({ instagram: e.target.value })} placeholder="https://www.instagram.com/seu.perfil/" /><small>Este endereço será usado nos botões de participação e de camisetas.</small></label><label className="admin-field">Nossa história<textarea rows={8} value={content.story} minLength={10} maxLength={8000} required onChange={e => update({ story: e.target.value })} /></label></section><details className="admin-panel admin-members-disclosure" open><summary><span><h2>Os sete administradores</h2><p>Gerencie os dados de cada administrador e escolha as fotos diretamente do seu computador.</p></span><span className="admin-disclosure-hint">Abrir ou fechar</span></summary><div className="admin-members-content">{content.members.map(member => <div className="admin-member" key={member.id}><h3>Administrador {String(member.id).padStart(2, "0")}</h3><label className="admin-field">Instagram do administrador {member.id}<input value={member.instagram} maxLength={255} onChange={e => updateLink(member, e.target.value)} placeholder="https://www.instagram.com/perfil.do.carro/" /></label><div className="admin-row"><label className="admin-field">Nome de exibição<input value={member.name} maxLength={100} onChange={e => updateMember(member.id, { name: e.target.value })} placeholder="Nome do administrador ou do projeto" /></label><label className="admin-field">Foto de perfil (do computador)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { void uploadPhoto(member.id, e.target.files?.[0]); e.currentTarget.value = ""; }} /><small>{fileNames[member.id] || (member.photo ? "Foto já salva" : "Escolha uma imagem (JPG, PNG, WEBP ou GIF; máximo de 1,5 MB).")}</small>{member.photo && <div className="admin-photo-preview"><img src={member.photo} alt={`Prévia da foto de ${member.name || `administrador ${member.id}`}`} /><span>Área de recorte</span></div>}</label></div><label className="admin-field">Descrição do perfil<textarea rows={3} value={member.bio} maxLength={400} onChange={e => updateMember(member.id, { bio: e.target.value })} placeholder="A bio ou uma breve descrição do projeto" /></label>{member.username && <p className="admin-small" style={{ marginTop: 16 }}>Perfil: <a href={instagramUrl(member.instagram)} target="_blank" rel="noopener noreferrer">@{member.username} <ArrowUpRight size={13} style={{ display: "inline" }} /></a></p>}</div>)}</div></details></fieldset><div className="admin-actions"><p className={`admin-feedback ${error ? "admin-error" : ""}`} role="status" aria-live="polite">{feedback || (dirty ? "Você tem alterações para salvar." : "Pronto para editar.")}</p><button className="button button-gold" type="submit" disabled={saving || !available || !dirty}><Save size={18} />{saving ? "Salvando…" : "Salvar alterações"}</button></div></form></main>;
}
