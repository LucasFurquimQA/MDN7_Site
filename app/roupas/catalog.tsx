"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, RotateCw, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ClubContent, imageFrames, Product } from "@/lib/club";

const whatsappUrl = (product: Pick<Product, "name" | "label">) => `https://wa.me/5516999936420?text=${encodeURIComponent(`Olá! Tenho interesse na peça "${product.name}" (${product.label}). Pode me enviar tamanhos, valores e disponibilidade?`)}`;
function Instagram({ size = 20 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></svg>; }

function variantsForProduct(product: Product) {
  return product.variants?.length ? product.variants : [{ type: product.type, cuts: product.cuts }];
}
function Shirt({ product, cut, side = "back", priority = false }: { product: Product; cut: string; side?: "back" | "front"; priority?: boolean }) {
  if (side === "front") {
    const frontKey = `front-${cut.toLowerCase()}`;
    const fallbackKey = "front-oversized";
    const frontFrame = imageFrames[frontKey];
    const fallbackFrame = imageFrames[fallbackKey];
    return <div className="shirt-crop" style={{ aspectRatio: `${(frontFrame || fallbackFrame).width} / ${(frontFrame || fallbackFrame).bottom - (frontFrame || fallbackFrame).top}` }}><img src={`/images/${frontFrame ? frontKey : fallbackKey}.png`} alt={`${product.name}, frente, ${cut}`} loading={priority ? "eager" : "lazy"} /></div>;
  }
  if (product.photo) return <div className="shirt-crop custom-shirt-crop"><img src={product.photo} alt={`${product.name}, ${product.label}`} loading={priority ? "eager" : "lazy"} /></div>;
  const key = `${product.id}-${cut.toLowerCase()}`;
  const frame = imageFrames[key] || imageFrames[`${product.id}-oversized`] || { width: 700, height: 700, top: 0, bottom: 700 };
  return <div className="shirt-crop" style={{ aspectRatio: `${frame.width} / ${frame.bottom - frame.top}` }}><img src={`/images/${key}.png`} alt={`${product.name}, ${product.label}`} loading={priority ? "eager" : "lazy"} width={frame.width} height={frame.height} style={{ top: `${-100 * frame.top / (frame.bottom - frame.top)}%` }} /></div>;
}

function ProductDetails({ product, type, cut, onClose }: { product: Product | null; type: string; cut: string; onClose: () => void }) {
  const [selectedType, setSelectedType] = useState(type);
  const [selectedCut, setSelectedCut] = useState(cut);
  const [side, setSide] = useState<"back" | "front">("back");
  const variants = product ? variantsForProduct(product) : [];
  const selectedVariant = variants.find(variant => variant.type === selectedType) || variants[0];
  useEffect(() => { setSelectedType(type); setSelectedCut(cut); setSide("back"); }, [product, type, cut]);
  useEffect(() => { if (selectedVariant && !selectedVariant.cuts.includes(selectedCut)) setSelectedCut(selectedVariant.cuts[0]); }, [selectedVariant, selectedCut]);
  return <Dialog open={!!product} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="product-dialog" showCloseButton={false}><DialogClose className="dialog-close icon-button" aria-label="Fechar detalhes"><X size={22} /></DialogClose>{product && selectedVariant && <><div className="detail-visual"><span className="photo-counter mono">{side === "back" ? "01 / COSTAS" : "02 / FRENTE"}</span><Shirt product={product} cut={selectedCut} side={side} priority /><button className="flip-button" onClick={() => setSide(side === "back" ? "front" : "back")}><RotateCw size={16} />Ver {side === "back" ? "frente" : "costas"}</button></div><div className="detail-info"><span className="eyebrow">MIDNIGH7 WEAR / {selectedType.toUpperCase()} / EDIÇÃO {product.edition}</span><DialogTitle>{product.name}</DialogTitle><DialogDescription>Uma paixão que também se veste. {product.label}. Consulte os tamanhos e condições do lote pelo WhatsApp.</DialogDescription><span className="field-title">TIPO DE PEÇA</span><div className="fit-tabs variant-tabs">{variants.map(variant => <button className={`variant-tab ${variant.type === selectedType ? "selected" : ""}`} type="button" key={variant.type} onClick={() => { setSelectedType(variant.type); setSelectedCut(variant.cuts[0]); }}>{variant.type}</button>)}</div><span className="field-title">CORTE DISPONÍVEL</span><div className="fit-tabs variant-tabs">{selectedVariant.cuts.map(availableCut => <button className={`variant-tab ${availableCut === selectedCut ? "selected" : ""}`} type="button" key={availableCut} onClick={() => setSelectedCut(availableCut)}>{availableCut}</button>)}</div><div className="detail-note"><span className="gold-label">VENDA POR LOTE</span><p>As peças são produzidas em lotes. Fale com a gente para reservar a sua.</p></div><a className="button button-gold" href={whatsappUrl(product)} target="_blank" rel="noopener noreferrer"><ShoppingBag size={19} />Pedir pelo WhatsApp<ArrowUpRight size={19} /></a><p className="mockup-note">Imagens de referência das estampas.</p></div></>}</DialogContent></Dialog>;
}

export default function RoupasCatalog({ content }: { content: ClubContent }) {
  const clothingTypes = [...new Set(content.products.flatMap(product => variantsForProduct(product).map(variant => variant.type)))];
  const [selectedType, setSelectedType] = useState(clothingTypes[0] || "Camiseta");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const products = content.products.filter(product => variantsForProduct(product).some(variant => variant.type === selectedType));
  const selectedVariant = selectedProduct ? variantsForProduct(selectedProduct).find(variant => variant.type === selectedType) || variantsForProduct(selectedProduct)[0] : null;
  const contactProduct = content.products[0] || { name: "uma peça", label: "catálogo" };
  return <><header className="header"><div className="nav-wrap"><a className="brand" href="/" aria-label="Voltar para o Midnigh7 Club"><img src="/images/logo.png" alt="Midnigh7 Club" width={220} height={50} /></a><a className="text-link" href="/"><ArrowLeft size={16} />Voltar ao clube</a><a className="nav-instagram" href={content.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={18} />Instagram<ArrowUpRight size={15} /></a></div></header><main className="clothing-marketplace"><div className="container"><div className="marketplace-hero"><div><span className="eyebrow"><span className="gold-line" />MIDNIGH7 WEAR / LOJA DO CLUBE</span><h1>Vista essa <span>paixão.</span></h1><p>Peças feitas para quem vive a cultura automotiva. Escolha sua estampa e fale com a gente para entrar no próximo lote.</p></div><div className="marketplace-badge"><ShoppingBag size={25} /><span>Venda atual<br /><strong>por lote</strong></span></div></div><div className="marketplace-toolbar"><div><span className="mono">CATÁLOGO / {String(products.length).padStart(2, "0")} PEÇAS</span><p>Tipos de peça cadastrados para cada arte.</p></div><div className="fit-tabs variant-tabs" role="tablist" aria-label="Tipos de roupa">{clothingTypes.map(type => <button className={`variant-tab ${type === selectedType ? "selected" : ""}`} type="button" role="tab" aria-selected={type === selectedType} key={type} onClick={() => setSelectedType(type)}>{type}</button>)}</div></div><div className="marketplace-grid">{products.map((product, index) => { const variant = variantsForProduct(product).find(item => item.type === selectedType) || variantsForProduct(product)[0]; const cut = variant.cuts[0]; return <button className="product-card marketplace-card" key={product.id} onClick={() => setSelectedProduct(product)} aria-label={`Ver ${product.name}, ${product.label}`}><div className="product-image"><div className="product-tags"><span className="mono">ED. {product.edition}</span><span className="mono">{selectedType.toUpperCase()}</span></div><Shirt product={product} cut={cut} priority={index < 2} /><span className="view-product">Ver detalhes<ArrowUpRight size={17} /></span></div><div className="product-caption"><div><span className="mono product-edition">{product.label}</span><h3>{product.name}</h3><p>{variant.cuts.join(" · ")}</p></div><span className="product-open"><ArrowUpRight size={21} /></span></div></button>})}</div><div className="marketplace-contact"><div><span className="eyebrow"><span className="gold-line" />ATENDIMENTO</span><h2>Quer garantir a sua?</h2><p>Chame no WhatsApp e consulte tamanhos, valores e disponibilidade do próximo lote.</p></div><a className="button button-gold" href={whatsappUrl(contactProduct)} target="_blank" rel="noopener noreferrer"><ShoppingBag size={19} />Falar no WhatsApp<ArrowUpRight size={19} /></a></div></div></main><ProductDetails product={selectedProduct} type={selectedType} cut={selectedVariant?.cuts[0] || ""} onClose={() => setSelectedProduct(null)} /></>;
}
