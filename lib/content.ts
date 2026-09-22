import { env } from "cloudflare:workers";
import { z } from "zod";
import { ClubContent, defaultContent, defaultProducts, instagramUrl, instagramUsername } from "./club";
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
  photo: photoSchema,
});
export const contentSchema = z.object({
  instagram: z.string().max(255).refine(value => !!instagramUsername(value), "Informe o perfil do Instagram do clube."),
  story: z.string().trim().min(10, "Escreva pelo menos uma frase sobre o grupo.").max(8000),
  members: z.array(memberSchema).length(7),
  products: z.array(productSchema).min(1, "Cadastre pelo menos uma peça.").max(50).default(defaultProducts),
}).superRefine((value, ctx) => {
  const usernames = new Set<string>();
  value.members.forEach((member, index) => {
    if (member.id !== index + 1) ctx.addIssue({ code: "custom", path: ["members", index], message: "Mantenha os sete administradores na ordem." });
    const username = instagramUsername(member.instagram);
    if (member.instagram.trim() && !username) ctx.addIssue({ code: "custom", path: ["members", index, "instagram"], message: `O Instagram do administrador ${index + 1} não é válido.` });
    if (username && usernames.has(username)) ctx.addIssue({ code: "custom", message: "Cada administrador deve ter um perfil diferente." });
    if (username) usernames.add(username);
  });
  const ids = new Set<string>();
  value.products.forEach((product, index) => {
    if (ids.has(product.id)) ctx.addIssue({ code: "custom", path: ["products", index, "id"], message: "Cada peça deve ter um identificador diferente." });
    ids.add(product.id);
  });
});
export function normalizeContent(input: ClubContent): ClubContent {
  return { story: input.story.trim(), instagram: instagramUrl(input.instagram), members: input.members.map(member => ({ ...member, instagram: instagramUrl(member.instagram), username: instagramUsername(member.instagram) || "", name: member.name.trim(), bio: member.bio.trim(), photo: member.photo.trim() })), products: (input.products || defaultProducts).map(product => ({ ...product, id: product.id.trim().toLowerCase(), name: product.name.trim(), edition: product.edition.trim(), label: product.label.trim(), type: product.type.trim(), photo: product.photo.trim() })) };
}
export async function readContent(): Promise<{ content: ClubContent; available: boolean }> {
  try {
    const record = await contentDb().prepare("SELECT content FROM site_content WHERE id = ?").bind(1).first<{ content: string }>();
    if (!record) return { content: defaultContent, available: true };
    return { content: normalizeContent(contentSchema.parse(JSON.parse(record.content))), available: true };
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
