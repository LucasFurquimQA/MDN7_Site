"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ClubContent, ClothingPhotos, emptyClothingPhotos, imageFrames, Product } from "@/lib/club";

const whatsappUrl = (product: Pick<Product, "name" | "label">) => `https://wa.me/5516999936420?text=${encodeURIComponent(`Olá! Tenho interesse na peça "${product.name}" (${product.label}). Pode me enviar tamanhos, valores e disponibilidade?`)}`;
function Instagram({ size = 20 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></svg>; }

function variantsForProduct(product: Product) {
  return product.variants?.length ? product.variants : [{ type: product.type, cuts: product.cuts }];
}
function photosForVariant(product: Product, type: string, cut: string): ClothingPhotos {
  const variant = variantsForProduct(product).find(item => item.type === type);
  const photos = variant?.photos?.[cut];
  if (photos?.images.length) return photos;
  return product.photo ? { images: [product.photo], cover: 0 } : emptyClothingPhotos;
}
function Shirt({ product, cut, photo, priority = false }: { product: Product; cut: string; photo?: string; priority?: boolean }) {
  const uploadedPhoto = photo || product.photo;
  if (uploadedPhoto) return <div className="shirt-crop custom-shirt-crop"><img src={uploadedPhoto} alt={`${product.name}, ${product.label}`} loading={priority ? "eager" : "lazy"} /></div>;
  const key = `${product.id}-${cut.toLowerCase()}`;
  const frame = imageFrames[key] || imageFrames[`${product.id}-oversized`] || { width: 700, height: 700, top: 0, bottom: 700 };
  return <div className="shirt-crop" style={{ aspectRatio: `${frame.width} / ${frame.bottom - frame.top}` }}><img src={`/images/${key}.png`} alt={`${product.name}, ${product.label}`} loading={priority ? "eager" : "lazy"} width={frame.width} height={frame.height} style={{ top: `${-100 * frame.top / (frame.bottom - frame.top)}%` }} /></div>;
}

function ProductCarousel({ product, type, cut, priority = false, onOpen }: { product: Product; type: string; cut: string; priority?: boolean; onOpen: () => void }) {
    const photos = photosForVariant(product, type, cut);
    const images = photos.images;
    const [index, setIndex] = useState(photos.cover);
    const [hovered, setHovered] = useState(false);
    useEffect(() => { setIndex(photos.cover); }, [product.id, type, cut, photos.cover]);
    useEffect(() => {
      if (images.length < 2 || hovered) return;
      const timer = window.setInterval(() => setIndex(current => (current + 1) % images.length), 4200);
      return () => window.clearInterval(timer);
    }, [images.length, hovered]);
    return <div className="product-carousel" onMouseEnter={() => { setHovered(true); setIndex(photos.cover); }} onMouseLeave={() => setHovered(false)}><button type="button" className="product-carousel-image" onClick={onOpen} aria-label={`Ver detalhes de ${product.name}`}><div className="product-tags"><span className="mono">ED. {product.edition}</span><span className="mono">{images.length > 1 ? `${index + 1} / ${images.length}` : type.toUpperCase()}</span></div><Shirt product={product} cut={cut} photo={images[index]} priority={priority} /><span className="view-product">Ver detalhes<ArrowUpRight size={17} /></span></button>{images.length > 1 && <div className="product-carousel-controls" aria-label={`Fotos de ${product.name}`}>{images.map((image, imageIndex) => <button type="button" key={`${imageIndex}-${image.slice(-12)}`} className={imageIndex === index ? "active" : ""} aria-label={`Mostrar foto ${imageIndex + 1} de ${images.length}`} aria-pressed={imageIndex === index} onClick={() => setIndex(imageIndex)}><span /></button>)}</div>}</div>;
  }

function ProductDetails({ product, type, cut, onClose }: { product: Product | null; type: string; cut: string; onClose: () => void }) {
  const [selectedType, setSelectedType] = useState(type);
  const [selectedCut, setSelectedCut] = useState(cut);
  const [index, setIndex] = useState(0);
  const variants = product ? variantsForProduct(product) : [];
  const selectedVariant = variants.find(variant => variant.type === selectedType) || variants[0];
  const photos = product ? photosForVariant(product, selectedType, selectedCut) : emptyClothingPhotos;
  const images = photos.images;
  useEffect(() => { setSelectedType(type); setSelectedCut(cut); }, [product, type, cut]);
  useEffect(() => { if (selectedVariant && !selectedVariant.cuts.includes(selectedCut)) setSelectedCut(selectedVariant.cuts[0]); }, [selectedVariant, selectedCut]);
  useEffect(() => { setIndex(photos.cover); }, [product, selectedType, selectedCut, photos.cover]);
  const goTo = (next: number) => setIndex(images.length ? ((next % images.length) + images.length) % images.length : 0);
  return <Dialog open={!!product} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="product-dialog" showCloseButton={false}><DialogClose className="dialog-close icon-button" aria-label="Fechar detalhes"><X size={22} /></DialogClose>{product && selectedVariant && <><div className="detail-visual">{images.length > 1 && <span className="photo-counter mono">{String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</span>}<Shirt product={product} cut={selectedCut} photo={images[index]} priority />{images.length > 1 && <div className="detail-photo-arrows"><button type="button" className="icon-button" aria-label="Foto anterior" onClick={() => goTo(index - 1)}><ArrowLeft size={18} /></button><button type="button" className="icon-button" aria-label="Próxima foto" onClick={() => goTo(index + 1)}><ArrowRight size={18} /></button></div>}{images.length > 1 && <div className="product-carousel-controls detail-photo-dots" aria-label={`Fotos de ${product.name}`}>{images.map((image, imageIndex) => <button type="button" key={`${imageIndex}-${image.slice(-12)}`} className={imageIndex === index ? "active" : ""} aria-label={`Mostrar foto ${imageIndex + 1} de ${images.length}`} aria-pressed={imageIndex === index} onClick={() => setIndex(imageIndex)}><span /></button>)}</div>}</div><div className="detail-info"><span className="eyebrow">MIDNIGH7 WEAR / {selectedType.toUpperCase()} / EDIÇÃO {product.edition}</span><DialogTitle>{product.name}</DialogTitle><DialogDescription>Uma paixão que também se veste. {product.label}. Consulte os tamanhos e condições do lote pelo WhatsApp.</DialogDescription><span className="field-title">TIPO DE PEÇA</span><div className="fit-tabs variant-tabs">{variants.map(variant => <button className={`variant-tab ${variant.type === selectedType ? "selected" : ""}`} type="button" key={variant.type} onClick={() => { setSelectedType(variant.type); setSelectedCut(variant.cuts[0]); }}>{variant.type}</button>)}</div><span className="field-title">CORTE DISPONÍVEL</span><div className="fit-tabs variant-tabs">{selectedVariant.cuts.map(availableCut => <button className={`variant-tab ${availableCut === selectedCut ? "selected" : ""}`} type="button" key={availableCut} onClick={() => setSelectedCut(availableCut)}>{availableCut}</button>)}</div><div className="detail-note"><span className="gold-label">VENDA POR LOTE</span><p>As peças são produzidas em lotes. Fale com a gente para reservar a sua.</p></div><a className="button button-gold" href={whatsappUrl(product)} target="_blank" rel="noopener noreferrer"><ShoppingBag size={19} />Pedir pelo WhatsApp<ArrowUpRight size={19} /></a><p className="mockup-note">Imagens de referência das estampas.</p></div></>}</DialogContent></Dialog>;
}

export default function RoupasCatalog({ content }: { content: ClubContent }) {
  const clothingTypes = [...new Set(content.products.flatMap(product => variantsForProduct(product).map(variant => variant.type)))];
  const [selectedType, setSelectedType] = useState(clothingTypes[0] || "Camiseta");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const products = content.products.filter(product => variantsForProduct(product).some(variant => variant.type === selectedType));
  const selectedVariant = selectedProduct ? variantsForProduct(selectedProduct).find(variant => variant.type === selectedType) || variantsForProduct(selectedProduct)[0] : null;
  const contactProduct = content.products[0] || { name: "uma peça", label: "catálogo" };
  return <><header className="header"><div className="nav-wrap"><a className="brand" href="/" aria-label="Voltar para o Midnigh7 Club"><img src="/images/logo.png" alt="Midnigh7 Club" width={220} height={50} /></a><a className="text-link" href="/"><ArrowLeft size={16} />Voltar ao clube</a><a className="nav-instagram" href={content.instagram} target="_blank" rel="noopener noreferrer" aria-label="Abrir Instagram do Midnigh7 Club em nova aba"><Instagram size={18} />Instagram<ArrowUpRight size={15} /></a></div></header><main className="clothing-marketplace"><div className="container"><div className="marketplace-hero"><div><span className="eyebrow"><span className="gold-line" />MIDNIGH7 WEAR / LOJA DO CLUBE</span><h1>Vista essa <span>paixão.</span></h1><p>Peças feitas para quem vive a cultura automotiva. Escolha sua estampa e fale com a gente para entrar no próximo lote.</p></div><div className="marketplace-badge"><ShoppingBag size={25} /><span>Venda atual<br /><strong>por lote</strong></span></div></div><div className="marketplace-toolbar"><div><span className="mono">CATÁLOGO / {String(products.length).padStart(2, "0")} PEÇAS</span><p>Tipos de peça cadastrados para cada arte.</p></div><div className="fit-tabs variant-tabs" role="group" aria-label="Filtrar por tipo de roupa">{clothingTypes.map(type => <button className={`variant-tab ${type === selectedType ? "selected" : ""}`} type="button" aria-pressed={type === selectedType} key={type} onClick={() => setSelectedType(type)}>{type}</button>)}</div></div><div className="marketplace-grid" aria-live="polite">{products.map((product, index) => { const variant = variantsForProduct(product).find(item => item.type === selectedType) || variantsForProduct(product)[0]; const cut = variant.cuts[0]; return <article className="product-card marketplace-card" key={product.id}><ProductCarousel product={product} type={selectedType} cut={cut} priority={index < 2} onOpen={() => setSelectedProduct(product)} /><div className="product-caption"><div><span className="mono product-edition">{product.label}</span><h3>{product.name}</h3><p>{variant.cuts.join(" · ")}</p></div><span className="product-open" aria-hidden="true"><ArrowUpRight size={21} /></span></div></article>})}</div><div className="marketplace-contact"><div><span className="eyebrow"><span className="gold-line" />ATENDIMENTO</span><h2>Quer garantir a sua?</h2><p>Chame no WhatsApp e consulte tamanhos, valores e disponibilidade do próximo lote.</p></div><a className="button button-gold" href={whatsappUrl(contactProduct)} target="_blank" rel="noopener noreferrer"><ShoppingBag size={19} />Falar no WhatsApp<ArrowUpRight size={19} /></a></div></div></main><ProductDetails product={selectedProduct} type={selectedType} cut={selectedVariant?.cuts[0] || ""} onClose={() => setSelectedProduct(null)} /></>;
}
