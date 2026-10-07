"use client";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowUpRight, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { instagramUsername, Partner } from "@/lib/club";
import { uploadImage } from "@/lib/image-storage";

type Draft = { nome: string; descricao: string; logo: string; instagram: string };
const emptyDraft: Draft = { nome: "", descricao: "", logo: "", instagram: "" };

export default function PartnersEditor({ initial, available }: { initial: Partner[]; available: boolean }) {
  const [partners, setPartners] = useState(initial);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(available ? "" : "Não foi possível carregar os parceiros salvos. Recarregue a página antes de editar.");
  const [error, setError] = useState(!available);
  const patch = (value: Partial<Draft>) => { setDraft(d => ({ ...d, ...value })); setFeedback(""); };
  const reset = () => { setDraft(emptyDraft); setEditingId(null); setFileName(""); };
  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(false); setFeedback("Enviando logo…");
    try {
      patch({ logo: await uploadImage(file) });
      setFileName(file.name);
      setFeedback("Logo enviado. Salve o parceiro para publicar.");
    } catch (e) { setError(true); setFeedback(e instanceof Error ? e.message : "Não foi possível enviar o logo."); } finally { setBusy(false); }
  }
  async function request(method: string, url: string, body?: unknown) {
    const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json() as { error?: string; partner?: Partner };
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a ação.");
    return data;
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy || !available) return;
    if (!draft.logo) { setError(true); setFeedback("Envie o logo do parceiro."); return; }
    setBusy(true); setError(false); setFeedback("");
    try {
      const { partner } = await request(editingId ? "PUT" : "POST", "/api/content/partners", editingId ? { ...draft, id: editingId } : draft);
      if (!partner) throw new Error("Não foi possível salvar.");
      setPartners(list => editingId ? list.map(p => p.id === partner.id ? partner : p) : [...list, partner]);
      reset();
      setFeedback(editingId ? "Parceiro atualizado. A página /parceiros já está atualizada." : "Parceiro cadastrado. Ele já aparece em /parceiros.");
    } catch (e) { setError(true); setFeedback(e instanceof Error ? e.message : "Não foi possível salvar."); } finally { setBusy(false); }
  }
  async function remove(partner: Partner) {
    if (busy || !window.confirm(`Excluir o parceiro "${partner.nome}"?`)) return;
    setBusy(true); setError(false); setFeedback("");
    try {
      await request("DELETE", `/api/content/partners?id=${encodeURIComponent(partner.id)}`);
      setPartners(list => list.filter(p => p.id !== partner.id));
      if (editingId === partner.id) reset();
      setFeedback("Parceiro excluído.");
    } catch (e) { setError(true); setFeedback(e instanceof Error ? e.message : "Não foi possível excluir."); } finally { setBusy(false); }
  }
  function edit(partner: Partner) {
    setEditingId(partner.id);
    setDraft({ nome: partner.nome, descricao: partner.descricao, logo: partner.logo, instagram: partner.instagram });
    setFileName(""); setFeedback(""); setError(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return <main className="admin-shell"><div className="admin-top"><a className="brand" href="/"><img src="/images/logo.png" alt="Midnigh7 Club" width={210} height={48} /></a><a className="text-link" href="/admin"><ArrowLeft size={16} />Voltar ao painel</a></div><p className="eyebrow">PAINEL DO CLUBE</p><h1>Parceiros</h1><p className="admin-intro">Cadastre, edite ou exclua os parceiros exibidos na página <a href="/parceiros" target="_blank" rel="noopener noreferrer">/parceiros</a>. As alterações aparecem no site assim que forem salvas.</p>
    <form onSubmit={save}><fieldset disabled={busy || !available} style={{ border: 0, margin: 0, padding: 0 }}><section className="admin-panel"><h2>{editingId ? "Editar parceiro" : "Novo parceiro"}</h2>
      <label className="admin-field">Nome do parceiro<input value={draft.nome} maxLength={100} required onChange={e => patch({ nome: e.target.value })} placeholder="Nome da marca ou empresa" /></label>
      <label className="admin-field">Logo (do computador)<span className="admin-file-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { void uploadLogo(e.target.files?.[0]); e.currentTarget.value = ""; }} /><span className="admin-file-button">Escolher arquivo</span></span><small>{fileName || (draft.logo ? "Logo já salvo" : "Nenhum arquivo escolhido")} · até 1,5 MB</small>{draft.logo && <div className="admin-partner-preview"><img src={draft.logo} alt="Prévia do logo" /></div>}</label>
      <label className="admin-field">Descrição<textarea rows={3} value={draft.descricao} maxLength={400} required onChange={e => patch({ descricao: e.target.value })} placeholder="Uma breve descrição do parceiro" /></label>
      <label className="admin-field">Instagram<input value={draft.instagram} maxLength={255} required onChange={e => patch({ instagram: e.target.value })} placeholder="@perfil ou https://www.instagram.com/perfil/" /></label>
      <div className="admin-partner-actions"><button className="button button-gold" type="submit" disabled={busy || !available}>{editingId ? <Save size={18} /> : <Plus size={18} />}{busy ? "Aguarde…" : editingId ? "Salvar parceiro" : "Cadastrar parceiro"}</button>{editingId && <button className="button button-outline" type="button" onClick={reset}><X size={18} />Cancelar edição</button>}</div>
    </section></fieldset></form>
    <p className={`admin-feedback ${error ? "admin-error" : ""}`} role="status" aria-live="polite" style={{ marginTop: 18 }}>{feedback}</p>
    <section className="admin-panel"><h2>Parceiros cadastrados ({partners.length})</h2>{partners.length ? <div className="admin-partner-list">{partners.map(partner => <div className="admin-partner-item" key={partner.id}><div className="admin-partner-thumb"><img src={partner.logo} alt={`Logo ${partner.nome}`} /></div><div className="admin-partner-info"><h3>{partner.nome}</h3><p>{partner.descricao}</p>{instagramUsername(partner.instagram) && <a className="admin-small" href={partner.instagram} target="_blank" rel="noopener noreferrer">@{instagramUsername(partner.instagram)} <ArrowUpRight size={13} style={{ display: "inline" }} /></a>}</div><div className="admin-partner-buttons"><button className="button button-outline" type="button" disabled={busy} onClick={() => edit(partner)}><Pencil size={16} />Editar</button><button className="button button-outline admin-danger" type="button" disabled={busy} onClick={() => void remove(partner)}><Trash2 size={16} />Excluir</button></div></div>)}</div> : <p className="admin-small" style={{ marginTop: 16 }}>Nenhum parceiro cadastrado ainda.</p>}</section>
  </main>;
}
