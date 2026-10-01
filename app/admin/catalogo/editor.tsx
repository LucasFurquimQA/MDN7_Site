"use client";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Save, Star, X } from "lucide-react";
import { ClubContent, ClothingVariant, MAX_PIECE_PHOTOS, Product } from "@/lib/club";
import { uploadImage } from "@/lib/image-storage";

const clothingCuts: Record<string, string[]> = {
  Camiseta: ["Oversized", "Babylook", "Básica", "Cropped"],
  Moletom: ["Oversized", "Canguru", "Básico", "Cropped", "Com capuz"],
  Boné: ["Aba curva", "Aba reta", "Trucker", "Dad hat"],
  Gorro: ["Tradicional", "Pescador", "Dobrável"],
};
const clothingTypes = Object.keys(clothingCuts);
const fallbackCuts = ["Básico", "Oversized", "Cropped", "Tradicional"];
function variantsForProduct(product: Product) {
  const variants = product.variants?.length ? product.variants : [{ type: product.type, cuts: product.cuts }];
  const selected = variants.find(variant => variant.type === product.type) || variants[0];
  return [{ ...selected, type: product.type, cuts: product.cuts.length ? product.cuts : selected.cuts }];
}
function VariantPhotoUploads({ product, variant, variantIndex, fileNames, onUpload, onRemove, onSetCover }: { product: Product; variant: ClothingVariant; variantIndex: number; fileNames: Record<string, string>; onUpload: (variantIndex: number, cut: string, file: File | undefined) => void; onRemove: (variantIndex: number, cut: string, photoIndex: number) => void; onSetCover: (variantIndex: number, cut: string, photoIndex: number) => void }) {
  return <>{variant.cuts.map(cut => { const photos = variant.photos?.[cut] || { images: [], cover: 0 }; const fileKey = `${product.id}-${variantIndex}-${cut}`; return <div className="admin-variant-photos" key={`${product.id}-${variant.type}-${cut}`}><strong>Fotos de {variant.type} / {cut}</strong><small>Envie até {MAX_PIECE_PHOTOS} fotos da peça e escolha a foto de prévia que aparece quando o cliente passa o mouse no catálogo.</small><div className="admin-photo-upload-grid">{photos.images.map((photo, photoIndex) => <div className="admin-photo-item" key={`${fileKey}-${photoIndex}`}><img src={photo} alt={`Foto ${photoIndex + 1} de ${product.name}, ${variant.type} / ${cut}`} /><div className="admin-photo-item-actions"><button type="button" className={`admin-photo-cover ${photoIndex === photos.cover ? "selected" : ""}`} aria-pressed={photoIndex === photos.cover} onClick={() => onSetCover(variantIndex, cut, photoIndex)}><Star size={13} />{photoIndex === photos.cover ? "Prévia" : "Usar como prévia"}</button><button type="button" className="admin-photo-remove" aria-label="Remover foto" onClick={() => onRemove(variantIndex, cut, photoIndex)}><X size={14} /></button></div></div>)}{photos.images.length < MAX_PIECE_PHOTOS && <label className="admin-photo-upload" key="add"><span>Adicionar foto ({photos.images.length}/{MAX_PIECE_PHOTOS})</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => { onUpload(variantIndex, cut, event.target.files?.[0]); event.currentTarget.value = ""; }} /><small>{fileNames[fileKey] || "Escolher foto"}</small></label>}</div></div>; })}</>;
}

function CustomTypeField({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const addType = () => {
    const value = type.trim();
    if (!value) return;
    onAdd(value);
    setType("");
    setOpen(false);
  };

  if (!open) {
    return <button type="button" className="button button-outline" onClick={() => setOpen(true)}>+ Adicionar outro tipo</button>;
  }

  return <div style={{ display: "flex", alignItems: "end", flexWrap: "wrap", gap: 8 }}>
    <label className="admin-field" style={{ flex: "1 1 180px", margin: 0 }}>Nome do novo tipo
      <input autoFocus value={type} maxLength={50} placeholder="Ex.: Jaqueta" onChange={event => setType(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addType(); } if (event.key === "Escape") setOpen(false); }} />
    </label>
    <button type="button" className="button button-gold" disabled={!type.trim()} onClick={addType}>Adicionar</button>
    <button type="button" className="button button-outline" onClick={() => setOpen(false)}>Cancelar</button>
  </div>;
}

export default function CatalogEditor({ initial, available }: { initial: ClubContent; available: boolean }) {
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(available ? "" : "Não foi possível carregar o conteúdo salvo. Recarregue a página antes de editar.");
  const [error, setError] = useState(!available);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  useEffect(() => { const leave = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave); }, [dirty]);
  const updateProduct = (id: string, patch: Partial<Product>) => { setContent(c => ({ ...c, products: c.products.map(p => { if (p.id !== id) return p; const next = { ...p, ...patch }; const source = patch.variants || p.variants || [{ type: p.type, cuts: p.cuts }]; const selected = source.find(variant => variant.type === next.type) || source.find(variant => variant.type === p.type) || source[0]; const variant = { ...selected, type: next.type, cuts: patch.cuts || selected.cuts }; next.variants = [variant]; next.cuts = variant.cuts; return next; }) })); setDirty(true); setFeedback(""); };
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
  const selectVariantType = (product: Product, type: string) => {
    const value = type.trim();
    if (!value) return;
    const existingType = [...clothingTypes, ...(product.variants || []).map(variant => variant.type)].find(option => option.toLowerCase() === value.toLowerCase());
    const selectedType = existingType || value;
    const variant = product.variants?.find(item => item.type === selectedType) || { type: selectedType, cuts: [clothingCuts[selectedType]?.[0] || "Básico"] };
    updateProduct(product.id, { type: selectedType, cuts: variant.cuts, variants: [variant] });
  };
  async function uploadVariantPhoto(product: Product, variantIndex: number, cut: string, file: File | undefined) {
    if (!file) return;
    const existing = variantsForProduct(product)[variantIndex]?.photos?.[cut];
    if ((existing?.images.length || 0) >= MAX_PIECE_PHOTOS) { setFeedback(`Envie no máximo ${MAX_PIECE_PHOTOS} fotos por peça.`); return; }
    setError(false);
    setFeedback("Enviando foto…");
    try {
      const photo = await uploadImage(file);
      const variants = variantsForProduct(product).map((variant, index) => { if (index !== variantIndex) return variant; const current = variant.photos?.[cut] || { images: [], cover: 0 }; return { ...variant, photos: { ...(variant.photos || {}), [cut]: { images: [...current.images, photo].slice(0, MAX_PIECE_PHOTOS), cover: current.cover } } }; });
      updateProduct(product.id, { variants });
      setFileNames(value => ({ ...value, [`${product.id}-${variantIndex}-${cut}`]: file.name }));
      setFeedback("Foto enviada. Salve as alterações para publicar.");
    } catch (uploadError) {
      setError(true);
      setFeedback(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar a foto.");
    }
  }
  function removeVariantPhoto(product: Product, variantIndex: number, cut: string, photoIndex: number) {
    const variants = variantsForProduct(product).map((variant, index) => { if (index !== variantIndex) return variant; const current = variant.photos?.[cut]; if (!current) return variant; const images = current.images.filter((_, i) => i !== photoIndex); const cover = current.cover > photoIndex ? current.cover - 1 : current.cover >= images.length ? Math.max(images.length - 1, 0) : current.cover; return { ...variant, photos: { ...(variant.photos || {}), [cut]: { images, cover } } }; });
    updateProduct(product.id, { variants });
    setDirty(true); setFeedback("");
  }
  function setVariantCoverPhoto(product: Product, variantIndex: number, cut: string, photoIndex: number) {
    const variants = variantsForProduct(product).map((variant, index) => { if (index !== variantIndex) return variant; const current = variant.photos?.[cut] || { images: [], cover: 0 }; return { ...variant, photos: { ...(variant.photos || {}), [cut]: { ...current, cover: photoIndex } } }; });
    updateProduct(product.id, { variants });
    setDirty(true); setFeedback("");
  }
  const toggleMaintenance = () => { setContent(c => ({ ...c, roupasMaintenance: !c.roupasMaintenance })); setDirty(true); setFeedback(""); };
  const removeProduct = (id: string) => { if (content.products.length <= 1) { setFeedback("Mantenha pelo menos uma peça no catálogo."); return; } setContent(c => ({ ...c, products: c.products.filter(p => p.id !== id) })); setDirty(true); };
  const addProduct = () => { const id = `peca-${Date.now()}`; setContent(c => ({ ...c, products: [...c.products, { id, name: "Nova peça", edition: "01", label: "Nova coleção", type: "Camiseta", cuts: ["Básico"], variants: [{ type: "Camiseta", cuts: ["Básico"] }], photo: "" }] })); setDirty(true); setFeedback(""); };
  async function uploadProductPhoto(id: string, file: File | undefined) {
    if (!file) return;
    setError(false);
    setFeedback("Enviando foto…");
    try {
      const photo = await uploadImage(file);
      updateProduct(id, { photo });
      setFileNames(v => ({ ...v, [id]: file.name }));
      setFeedback("Foto enviada. Salve as alterações para publicar.");
    } catch (uploadError) {
      setError(true);
      setFeedback(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar a foto.");
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
  return <main className="admin-shell"><div className="admin-top"><a className="brand" href="/"><img src="/images/logo.png" alt="Midnigh7 Club" width={210} height={48} /></a><a className="text-link" href="/admin"><ArrowLeft size={16} />Voltar ao painel</a></div><p className="eyebrow">MIDNIGH7 WEAR</p><h1>Midnigh7 Wear, do seu jeito.</h1><p className="admin-intro">Edite nomes, cortes, tipos e fotos das peças. As alterações aparecem na loja depois de salvar.</p><form onSubmit={save}><fieldset disabled={saving || !available} style={{ border: 0, margin: 0, padding: 0 }}><section className="admin-panel admin-maintenance"><div className="admin-section-heading"><div><h2>Manutenção da loja</h2><p>Enquanto ativado, quem acessar /7wear vê o aviso &quot;Estamos preparando tudo pra você!&quot; no lugar do catálogo.</p></div><button type="button" role="switch" aria-checked={content.roupasMaintenance} className={`admin-switch ${content.roupasMaintenance ? "on" : ""}`} onClick={toggleMaintenance}><span className="admin-switch-track"><span className="admin-switch-thumb" /></span><span className="admin-switch-label">{content.roupasMaintenance ? "Em manutenção" : "Loja no ar"}</span></button></div></section><section className="admin-panel admin-catalog-disclosure">
<div className="admin-section-heading"><div><h2>Peças cadastradas</h2><p>As fotos enviadas aparecem na prévia antes de salvar.</p></div><button className="button button-outline" type="button" onClick={addProduct}>Adicionar peça</button></div>{content.products.map(product => <details className="admin-product-disclosure" key={product.id} open><summary><span><strong>{product.name || "Peça sem nome"}</strong><small>{product.type} · {product.cuts.join(", ")}</small></span><span className="admin-disclosure-hint">Editar</span></summary><div className="admin-variants"><div className="admin-variants-heading"><strong>Tipo e cortes</strong><small>Escolha o tipo e os cortes uma única vez; as fotos ficam agrupadas abaixo por corte.</small></div><div className="admin-choice-grid" role="group" aria-label="Tipo de peça">{[...clothingTypes, ...variantsForProduct(product).map(variant => variant.type).filter(type => !clothingTypes.includes(type))].map(type => <button className={`admin-choice ${product.type === type ? "selected" : ""}`} type="button" key={type} aria-pressed={product.type === type} onClick={() => selectVariantType(product, type)}>{type}</button>)}</div><CustomTypeField onAdd={type => selectVariantType(product, type)} />{variantsForProduct(product).map((variant, variantIndex) => <div className="admin-variant" key={`${product.id}-${variant.type}`}><span className="admin-variant-name">{variant.type}</span><div className="admin-choice-grid" role="group" aria-label={`Cortes disponíveis para ${variant.type}`}>{[...(clothingCuts[variant.type] || fallbackCuts), ...variant.cuts.filter(cut => !(clothingCuts[variant.type] || fallbackCuts).includes(cut))].map(cut => <button className={`admin-choice ${variant.cuts.includes(cut) ? "selected" : ""}`} type="button" key={cut} aria-pressed={variant.cuts.includes(cut)} onClick={() => toggleVariantCut(product, variantIndex, cut)}>{cut}</button>)}</div><VariantPhotoUploads product={product} variant={variant} variantIndex={variantIndex} fileNames={fileNames} onUpload={(index, cut, file) => { void uploadVariantPhoto(product, index, cut, file); }} onRemove={(index, cut, photoIndex) => removeVariantPhoto(product, index, cut, photoIndex)} onSetCover={(index, cut, photoIndex) => setVariantCoverPhoto(product, index, cut, photoIndex)} /></div>)}</div><div className="admin-member"><div className="admin-row"><label className="admin-field">Nome da peça<input value={product.name} maxLength={120} required onChange={e => updateProduct(product.id, { name: e.target.value })} /></label></div><div className="admin-row"><label className="admin-field">Edição<input value={product.edition} maxLength={30} required onChange={e => updateProduct(product.id, { edition: e.target.value })} /></label><label className="admin-field">Legenda<input value={product.label} maxLength={80} required onChange={e => updateProduct(product.id, { label: e.target.value })} /></label></div><button className="text-link admin-remove-button" type="button" onClick={() => removeProduct(product.id)}>Remover peça</button></div></details>)}</section></fieldset><div className="admin-actions"><p className={`admin-feedback ${error ? "admin-error" : ""}`} role="status" aria-live="polite">{feedback || (dirty ? "Você tem alterações para salvar." : "Pronto para editar.")}</p><button className="button button-gold" type="submit" disabled={saving || !available || !dirty}><Save size={18} />{saving ? "Salvando…" : "Salvar alterações"}</button></div></form></main>;}
