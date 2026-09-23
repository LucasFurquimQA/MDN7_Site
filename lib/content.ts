import { env } from "cloudflare:workers";
import { z } from "zod";
import { ClubContent, ClothingVariant, MAX_PIECE_PHOTOS, defaultContent, defaultProducts, instagramUrl, instagramUsername } from "./club";
import { getCloudflareUser } from "@/app/cloudflare-auth";

type ClubEnv = { DB?: D1Database; ADMIN_EMAIL?: string; INSTAGRAM_ACCESS_TOKEN?: string; INSTAGRAM_BUSINESS_ACCOUNT_ID?: string; INSTAGRAM_API_VERSION?: string };
export function clubEnv(): ClubEnv { return env as unknown as ClubEnv; }
export function contentDb() { const db = clubEnv().DB; if (!db) throw new Error("Content database is unavailable"); return db; }
export async function isAdmin() {
  const user = await getCloudflareUser();
  const admin = clubEnv().ADMIN_EMAIL;
  return !!(user && admin && user.email.trim().toLowerCase() === admin.trim().toLowerCase());
}
const photoSchema = z.string().max(2_000_000).refine(value => !value || /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(value), "Envie a foto pelo seu computador.");
const uploadedPhotoSchema = z.string().max(2_000_000).refine(value => /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(value), "Envie a foto pelo seu computador.");
const photosSchema = z.object({ images: z.array(uploadedPhotoSchema).max(MAX_PIECE_PHOTOS).default([]), cover: z.number().int().min(0).max(MAX_PIECE_PHOTOS - 1).default(0) });
const memberSchema = z.object({
  id: z.number().int().min(1).max(7), instagram: z.string().max(255), username: z.string().max(30),
  name: z.string().max(100), bio: z.string().max(400), photo: photoSchema,
});
const productSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1, "Informe o nome da peça.").max(120),
  edition: z.string().trim().min(1).max(30),
  label: z.string().trim().min(1).max(80),
  type: z.string().trim().min(1, "Informe o tipo da roupa.").max(50),
  cuts: z.array(z.string().trim().min(1).max(50)).min(1, "Informe pelo menos um corte.").max(20).default(["Oversized"]),
  photo: photoSchema,
  variants: z.array(z.object({ type: z.string().trim().min(1).max(50), cuts: z.array(z.string().trim().min(1).max(50)).min(1).max(20), photos: z.record(z.string(), photosSchema).optional() })).min(1).optional(),
});
export const contentSchema = z.object({
  instagram: z.string().max(255).refine(value => !!instagramUsername(value), "Informe o perfil do Instagram do clube."),
  story: z.string().trim().min(10, "Escreva pelo menos uma frase sobre o grupo.").max(8000),
  members: z.array(memberSchema).length(7),
  products: z.array(productSchema).min(1, "Cadastre pelo menos uma peça.").max(50).default(defaultProducts),
  roupasMaintenance: z.boolean().default(false),
}).superRefine((value, ctx) => {
  const usernames = new Set<string>();
  value.members.forEach((member, index) => {
    if (member.id !== index + 1) ctx.addIssue({ code: "custom", path: ["members", index], message: "Mantenha os sete referências na ordem." });
    const username = instagramUsername(member.instagram);
    if (member.instagram.trim() && !username) ctx.addIssue({ code: "custom", path: ["members", index, "instagram"], message: `O Instagram do referência ${index + 1} não é válido.` });
    if (username && usernames.has(username)) ctx.addIssue({ code: "custom", message: "Cada referência deve ter um perfil diferente." });
    if (username) usernames.add(username);
  });
  const ids = new Set<string>();
  value.products.forEach((product, index) => {
    if (ids.has(product.id)) ctx.addIssue({ code: "custom", path: ["products", index, "id"], message: "Cada peça deve ter um identificador diferente." });
    ids.add(product.id);
  });
});
export function normalizeContent(input: ClubContent): ClubContent {
  return { story: input.story.trim(), instagram: instagramUrl(input.instagram), roupasMaintenance: !!input.roupasMaintenance, members: input.members.map(member => ({ ...member, instagram: instagramUrl(member.instagram), username: instagramUsername(member.instagram) || "", name: member.name.trim(), bio: member.bio.trim(), photo: member.photo.trim() })), products: (input.products || defaultProducts).map(product => {
    const legacyCuts = Array.isArray(product.cuts) ? [...new Set(product.cuts.map(cut => cut.trim()).filter(Boolean))] : product.cut?.trim() ? [product.cut.trim()] : ["Oversized"];
    const variants: ClothingVariant[] = (product.variants?.length ? product.variants : [{ type: product.type, cuts: legacyCuts }]).map(variant => {
      const photos = variant.photos && Object.fromEntries(Object.entries(variant.photos).map(([cut, value]) => [cut, { images: value.images.slice(0, MAX_PIECE_PHOTOS), cover: Math.min(Math.max(value.cover, 0), Math.max(value.images.length - 1, 0)) }]));
      return { type: variant.type.trim(), cuts: [...new Set(variant.cuts.map(cut => cut.trim()).filter(Boolean))], photos };
    }).filter(variant => variant.type && variant.cuts.length);
    const primary = variants[0] || { type: product.type.trim(), cuts: legacyCuts };
    return { ...product, id: product.id.trim().toLowerCase(), name: product.name.trim(), edition: product.edition.trim(), label: product.label.trim(), type: primary.type, cuts: primary.cuts, variants, photo: product.photo.trim() };
  }) };
}
// Older saved content stored four fixed photo slots (front/back piece/model) instead of a photo list; convert it to the current shape before validating.
function migrateLegacyPiecePhotos(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { products?: unknown }).products)) return raw;
  const products = (raw as { products: unknown[] }).products;
  for (const product of products) {
    if (!product || typeof product !== "object") continue;
    const variants = (product as { variants?: unknown }).variants;
    if (!Array.isArray(variants)) continue;
    for (const variant of variants) {
      if (!variant || typeof variant !== "object") continue;
      const photos = (variant as { photos?: Record<string, unknown> }).photos;
      if (!photos || typeof photos !== "object") continue;
      for (const cut of Object.keys(photos)) {
        const value = photos[cut] as Record<string, unknown>;
        if (!value || Array.isArray(value.images)) continue;
        const legacy = value as { frontPiece?: string; frontModel?: string; backPiece?: string; backModel?: string };
        const images = [legacy.frontPiece, legacy.frontModel, legacy.backPiece, legacy.backModel].filter((item): item is string => !!item);
        photos[cut] = { images, cover: 0 };
      }
    }
  }
  return raw;
}
export async function readContent(): Promise<{ content: ClubContent; available: boolean }> {
  try {
    const record = await contentDb().prepare("SELECT content FROM site_content WHERE id = ?").bind(1).first<{ content: string }>();
    if (!record) return { content: defaultContent, available: true };
    return { content: normalizeContent(contentSchema.parse(migrateLegacyPiecePhotos(JSON.parse(record.content)))), available: true };
  } catch (error) {
    console.error("Club content could not be read", error instanceof Error ? error.message : "Database error");
    return { content: defaultContent, available: false };
  }
}
export function mutationOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
export function noStoreJson(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
