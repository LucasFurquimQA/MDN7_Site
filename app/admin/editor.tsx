"use client";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Save } from "lucide-react";
import { ClubContent, ClothingPhotos, ClothingVariant, instagramUsername, instagramUrl, Member, Product } from "@/lib/club";

const clothingCuts: Record<string, string[]> = {
  Camiseta: ["Oversized", "Babylook", "Básica", "Cropped"],
  Moletom: ["Oversized", "Canguru", "Básico", "Cropped", "Com capuz"],
  Boné: ["Aba curva", "Aba reta", "Trucker", "Dad hat"],
  Gorro: ["Tradicional", "Pescador", "Dobrável"],
};
const clothingTypes = Object.keys(clothingCuts);
const fallbackCuts = ["Básico", "Oversized", "Cropped", "Tradicional"];
const photoSlots: [keyof ClothingPhotos, string][] = [["frontPiece", "Frente da peça"], ["frontModel", "Frente no modelo"], ["backPiece", "Verso da peça"], ["backModel", "Verso no modelo"]];
function optionsForProduct(product: Product) {
  const options = clothingCuts[product.type] || fallbackCuts;
  return [...options, ...product.cuts.filter(cut => !options.includes(cut))];
}
function variantsForProduct(product: Product) {
  return product.variants?.length ? product.variants : [{ type: product.type, cuts: product.cuts }];
}
function VariantPhotoUploads({ product, variant, variantIndex, fileNames, onUpload }: { product: Product; variant: ClothingVariant; variantIndex: number; fileNames: Record<string, string>; onUpload: (variantIndex: number, cut: string, key: keyof ClothingPhotos, file: File | undefined) => void }) {
  return <>{variant.cuts.map(cut => <div className="admin-variant-photos" key={`${product.id}-${variant.type}-${cut}`}><strong>Fotos de {variant.type} / {cut}</strong><small>Frente e verso da peça, além de frente e verso no modelo.</small><div className="admin-photo-upload-grid">{photoSlots.map(([photoKey, label]) => { const photo = variant.photos?.[cut]?.[photoKey] || ""; const fileKey = `${product.id}-${variantIndex}-${cut}-${photoKey}`; return <label className="admin-photo-upload" key={photoKey}><span>{label}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => { onUpload(variantIndex, cut, photoKey, event.target.files?.[0]); event.currentTarget.value = ""; }} /><small>{fileNames[fileKey] || (photo ? "Foto já salva" : "Escolher foto")}</small>{photo && <img src={photo} alt={`Prévia: ${label} de ${product.name}`} />}</label>; })}</div></div>)}</>;
}

export default function AdminEditor({ initial, available }: { initial: ClubContent; available: boolean }) {
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(available ? "" : "Não foi possível carregar o conteúdo salvo. Recarregue a página antes de editar.");
  const [error, setError] = useState(!available);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  useEffect(() => { const leave = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave); }, [dirty]);
  const update = (patch: Partial<ClubContent>) => { setContent(c => ({ ...c, ...patch })); setDirty(true); setFeedback(""); };
  const updateProduct = (id: string, patch: Partial<Product>) => { setContent(c => ({ ...c, products: c.products.map(p => { if (p.id !== id) return p; const next = { ...p, ...patch }; if (patch.type || patch.cuts) { const variants = variantsForProduct(next); variants[0] = { type: next.type, cuts: next.cuts }; next.variants = variants; } return next; }) })); setDirty(true); setFeedback(""); };
  const updateVariant = (product: Product, index: number, patch: Partial<ClothingVariant>) => {
    const variants = variantsForProduct(product).map((variant, variantIndex) => variantIndex === index ? { ...variant, ...patch } : variant);
    updateProduct(product.id, { variants, type: variants[0].type, cuts: variants[0].cuts });
  };
  const toggleVariantCut = (product: Product, variantIndex: number, cut: string) => {
    const variant = variantsForProduct(product)[variantIndex];
    if (!variant) return;
    const cuts = variant.cuts.includes(cut) ? variant.cuts.filter(value => value !== cut) : [...variant.cuts, cut];
    if (!cuts.length) { setFeedback("Mantenha pelo menos um corte selecionado por tipo de peça."); return; }
    updateVariant(product, variantIndex, { cuts });
  };
  const toggleVariantType = (product: Product, type: string) => {
    const variants = variantsForProduct(product);
    const existingIndex = variants.findIndex(variant => variant.type === type);
    if (existingIndex >= 0) {
      if (variants.length === 1) { setFeedback("Mantenha pelo menos um tipo de peça."); return; }
      const next = variants.filter((_, index) => index !== existingIndex);
      updateProduct(product.id, { variants: next, type: next[0].type, cuts: next[0].cuts });
      return;
    }
    const next = [...variants, { type, cuts: clothingCuts[type] ? [clothingCuts[type][0]] : ["Básico"] }];
    updateProduct(product.id, { variants: next });
  };
  async function uploadVariantPhoto(product: Product, variantIndex: number, cut: string, photoKey: keyof ClothingPhotos, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setFeedback("Selecione um arquivo de imagem válido."); return; }
    if (file.size > 1_500_000) { setFeedback("A foto deve ter no máximo 1,5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") { setFeedback("Não foi possível ler essa foto."); return; }
      const variants = variantsForProduct(product).map((variant, index) => index === variantIndex ? { ...variant, photos: { ...(variant.photos || {}), [cut]: { frontPiece: "", frontModel: "", backPiece: "", backModel: "", ...(variant.photos?.[cut] || {}), [photoKey]: reader.result } } } : variant);
      updateProduct(product.id, { variants });
      setFileNames(value => ({ ...value, [`${product.id}-${variantIndex}-${cut}-${photoKey}`]: file.name }));
      setFeedback("Foto carregada. Salve as alterações para publicar.");
    };
    reader.onerror = () => setFeedback("Não foi possível ler essa foto.");
    reader.readAsDataURL(file);
  }
  const toggleCut = (product: Product, cut: string) => {
    if (product.cuts.includes(cut) && product.cuts.length === 1) {
      setFeedback("Mantenha pelo menos um corte selecionado.");
      return;
    }
    updateProduct(product.id, { cuts: product.cuts.includes(cut) ? product.cuts.filter(value => value !== cut) : [...product.cuts, cut] });
  };
  const removeProduct = (id: string) => { if (content.products.length <= 1) { setFeedback("Mantenha pelo menos uma peça no catálogo."); return; } setContent(c => ({ ...c, products: c.products.filter(p => p.id !== id) })); setDirty(true); };
  const addProduct = () => { const id = `peca-${Date.now()}`; setContent(c => ({ ...c, products: [...c.products, { id, name: "Nova peça", edition: "01", label: "Nova coleção", type: "Camiseta", cuts: ["Básico"], variants: [{ type: "Camiseta", cuts: ["Básico"] }], photo: "" }] })); setDirty(true); setFeedback(""); };
  async function uploadProductPhoto(id: string, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setFeedback("Selecione um arquivo de imagem válido."); return; }
    if (file.size > 1_500_000) { setFeedback("A foto deve ter no máximo 1,5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result !== "string") { setFeedback("Não foi possível ler essa foto."); return; } updateProduct(id, { photo: reader.result }); setFileNames(v => ({ ...v, [id]: file.name })); setFeedback("Foto carregada. Salve as alterações para publicar."); };
    reader.onerror = () => setFeedback("Não foi possível ler essa foto.");
    reader.readAsDataURL(file);
  }
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
  return <main className="admin-shell"><div className="admin-top"><a className="brand" href="/"><img src="/images/logo.png" alt="Midnigh7 Club" width={210} height={48} /></a><a className="text-link" href="/"><ArrowLeft size={16} />Voltar ao site</a></div><p className="eyebrow">PAINEL DO CLUBE</p><h1>O clube, do seu jeito.</h1><p className="admin-intro">Atualize a história, o Instagram oficial e as sete referências. As alterações aparecem no site depois de salvar.</p><form onSubmit={save}><fieldset disabled={saving || !available} style={{ border: 0, margin: 0, padding: 0 }}><section className="admin-panel"><h2>O grupo</h2><label className="admin-field">Instagram oficial<input value={content.instagram} maxLength={255} required onChange={e => update({ instagram: e.target.value })} placeholder="https://www.instagram.com/seu.perfil/" /><small>Este endereço será usado nos botões de participação e de camisetas.</small></label><label className="admin-field">Nossa história<textarea rows={8} value={content.story} minLength={10} maxLength={8000} required onChange={e => update({ story: e.target.value })} /></label></section><details className="admin-panel admin-catalog-disclosure" open><summary><span><h2>Catálogo de roupas</h2><p>Abra para editar nomes, cortes, tipos e fotos das peças.</p></span><span className="admin-disclosure-hint">Abrir ou fechar</span></summary><div className="admin-section-heading"><div><p>As fotos enviadas aparecem na prévia antes de salvar.</p></div><button className="button button-outline" type="button" onClick={addProduct}>Adicionar peça</button></div>{content.products.map(product => <details className="admin-product-disclosure" key={product.id} open><summary><span><strong>{product.name || "Peça sem nome"}</strong><small>{product.type} · {product.cuts.join(", ")}</small></span><span className="admin-disclosure-hint">Editar</span></summary><div className="admin-variants"><div className="admin-variants-heading"><strong>Tipos de peça disponíveis para esta arte</strong><small>Escolha uma ou mais peças e depois os cortes de cada tipo.</small></div><div className="admin-choice-grid" role="group" aria-label="Tipos de peça disponíveis">{[...clothingTypes, ...variantsForProduct(product).map(variant => variant.type).filter(type => !clothingTypes.includes(type))].map(type => <button className={`admin-choice ${variantsForProduct(product).some(variant => variant.type === type) ? "selected" : ""}`} type="button" key={type} aria-pressed={variantsForProduct(product).some(variant => variant.type === type)} onClick={() => toggleVariantType(product, type)}>{type}</button>)}</div>{variantsForProduct(product).map((variant, variantIndex) => <div className="admin-variant" key={`${product.id}-${variant.type}`}><span className="admin-variant-name">{variant.type}</span><div className="admin-choice-grid" role="group" aria-label={`Cortes disponíveis para ${variant.type}`}>{[...(clothingCuts[variant.type] || fallbackCuts), ...variant.cuts.filter(cut => !(clothingCuts[variant.type] || fallbackCuts).includes(cut))].map(cut => <button className={`admin-choice ${variant.cuts.includes(cut) ? "selected" : ""}`} type="button" key={cut} aria-pressed={variant.cuts.includes(cut)} onClick={() => toggleVariantCut(product, variantIndex, cut)}>{cut}</button>)}</div><VariantPhotoUploads product={product} variant={variant} variantIndex={variantIndex} fileNames={fileNames} onUpload={(index, cut, photoKey, file) => { void uploadVariantPhoto(product, index, cut, photoKey, file); }} /></div>)}</div><div className="admin-member"><div className="admin-row"><label className="admin-field">Nome da peça<input value={product.name} maxLength={120} required onChange={e => updateProduct(product.id, { name: e.target.value })} /></label><div className="admin-field"><span>Tipo de roupa</span><div className="admin-choice-grid" role="group" aria-label="Tipo de roupa">{[...clothingTypes, ...(clothingTypes.includes(product.type) ? [] : [product.type])].map(type => <button className={`admin-choice ${product.type === type ? "selected" : ""}`} type="button" key={type} aria-pressed={product.type === type} onClick={() => updateProduct(product.id, { type })}>{type}</button>)}</div><input value={clothingTypes.includes(product.type) ? "" : product.type} maxLength={50} placeholder="Outro tipo de roupa" aria-label="Nome de outro tipo de roupa" onChange={e => updateProduct(product.id, { type: e.target.value })} /></div></div>  <div className="admin-row"><label className="admin-field">Edição<input value={product.edition} maxLength={30} required onChange={e => updateProduct(product.id, { edition: e.target.value })} /></label><label className="admin-field">Legenda<input value={product.label} maxLength={80} required onChange={e => updateProduct(product.id, { label: e.target.value })} /></label></div><div className="admin-field"><span>Cortes</span><div className="admin-choice-grid" role="group" aria-label={`Cortes de ${product.type}`}>{optionsForProduct(product).map(cut => <button className={`admin-choice ${product.cuts.includes(cut) ? "selected" : ""}`} type="button" key={cut} aria-pressed={product.cuts.includes(cut)} onClick={() => toggleCut(product, cut)}>{cut}</button>)}</div><small>Selecione um ou mais cortes disponíveis para este tipo de roupa.</small></div><label className="admin-field">Foto da peça<span className="admin-file-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { void uploadProductPhoto(product.id, e.target.files?.[0]); e.currentTarget.value = ""; }} /><span className="admin-file-button">Escolher arquivo</span></span><small>{fileNames[product.id] || (product.photo ? "Foto já salva" : "Nenhum arquivo escolhido")}</small>{product.photo && <div className="admin-product-preview"><img src={product.photo} alt={`Prévia de ${product.name}`} /><span>Prévia da foto enviada</span></div>}</label><button className="text-link admin-remove-button" type="button" onClick={() => removeProduct(product.id)}>Remover peça</button></div></details>)}</details><details className="admin-panel admin-members-disclosure" open><summary><span><h2>As sete referências</h2><p>Gerencie os dados de cada referência e escolha as fotos diretamente do seu computador.</p></span><span className="admin-disclosure-hint">Abrir ou fechar</span></summary><div className="admin-members-content">{content.members.map(member => <div className="admin-member" key={member.id}><h3>Referência {String(member.id).padStart(2, "0")}</h3><label className="admin-field">Instagram da referência {member.id}<input value={member.instagram} maxLength={255} onChange={e => updateLink(member, e.target.value)} placeholder="https://www.instagram.com/perfil.do.carro/" /></label><div className="admin-row"><label className="admin-field">Nome de exibição<input value={member.name} maxLength={100} onChange={e => updateMember(member.id, { name: e.target.value })} placeholder="Nome da referência ou do projeto" /></label><label className="admin-field">Foto de perfil (do computador)<span className="admin-file-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { void uploadPhoto(member.id, e.target.files?.[0]); e.currentTarget.value = ""; }} /><span className="admin-file-button">Escolher arquivo</span></span><small>{fileNames[member.id] || (member.photo ? "Foto já salva" : "Nenhum arquivo escolhido")}</small>{member.photo && <div className="admin-photo-preview"><img src={member.photo} alt={`Prévia da foto de ${member.name || `referência ${member.id}`}`} /><span>Prévia centralizada</span></div>}</label></div><label className="admin-field">Descrição do perfil<textarea rows={3} value={member.bio} maxLength={400} onChange={e => updateMember(member.id, { bio: e.target.value })} placeholder="A bio ou uma breve descrição do projeto" /></label>{member.username && <p className="admin-small" style={{ marginTop: 16 }}>Perfil: <a href={instagramUrl(member.instagram)} target="_blank" rel="noopener noreferrer">@{member.username} <ArrowUpRight size={13} style={{ display: "inline" }} /></a></p>}</div>)}</div></details></fieldset><div className="admin-actions"><p className={`admin-feedback ${error ? "admin-error" : ""}`} role="status" aria-live="polite">{feedback || (dirty ? "Você tem alterações para salvar." : "Pronto para editar.")}</p><button className="button button-gold" type="submit" disabled={saving || !available || !dirty}><Save size={18} />{saving ? "Salvando…" : "Salvar alterações"}</button></div></form></main>;
}
