import { z } from "zod";
import { instagramUrl, instagramUsername, Partner } from "./club";
import { contentDb, storedImagePath } from "./content";

export const partnerSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do parceiro.").max(100, "O nome deve ter no máximo 100 caracteres."),
  descricao: z.string().trim().min(1, "Escreva uma descrição para o parceiro.").max(400, "A descrição deve ter no máximo 400 caracteres."),
  logo: z.string().refine(value => storedImagePath.test(value), "Envie o logo do parceiro."),
  instagram: z.string().max(255).refine(value => !!instagramUsername(value), "Informe um Instagram válido (@perfil ou link)."),
});
export type PartnerInput = z.infer<typeof partnerSchema>;

const createTable = "CREATE TABLE IF NOT EXISTS partners (id TEXT PRIMARY KEY NOT NULL, nome TEXT NOT NULL, descricao TEXT NOT NULL, logo TEXT NOT NULL, instagram TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)";
let tableReady: Promise<unknown> | null = null;
async function partnersDb() {
  const db = contentDb();
  tableReady ??= db.prepare(createTable).run().catch(error => { tableReady = null; throw error; });
  await tableReady;
  return db;
}

export async function listPartners(): Promise<{ partners: Partner[]; available: boolean }> {
  try {
    const db = await partnersDb();
    const { results } = await db.prepare("SELECT id, nome, descricao, logo, instagram, created_at, updated_at FROM partners ORDER BY created_at ASC, id ASC").all<Partner>();
    return { partners: results, available: true };
  } catch (error) {
    console.error("Partners could not be read", error instanceof Error ? error.message : "Database error");
    return { partners: [], available: false };
  }
}

export async function createPartner(input: PartnerInput): Promise<Partner> {
  const db = await partnersDb();
  const now = new Date().toISOString();
  const partner: Partner = { id: crypto.randomUUID(), nome: input.nome, descricao: input.descricao, logo: input.logo, instagram: instagramUrl(input.instagram), created_at: now, updated_at: now };
  await db.prepare("INSERT INTO partners (id, nome, descricao, logo, instagram, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(partner.id, partner.nome, partner.descricao, partner.logo, partner.instagram, now, now).run();
  return partner;
}

export async function updatePartner(id: string, input: PartnerInput): Promise<Partner | null> {
  const db = await partnersDb();
  const now = new Date().toISOString();
  const instagram = instagramUrl(input.instagram);
  const result = await db.prepare("UPDATE partners SET nome = ?, descricao = ?, logo = ?, instagram = ?, updated_at = ? WHERE id = ?").bind(input.nome, input.descricao, input.logo, instagram, now, id).run();
  if (!result.meta.changes) return null;
  return db.prepare("SELECT id, nome, descricao, logo, instagram, created_at, updated_at FROM partners WHERE id = ?").bind(id).first<Partner>();
}

export async function deletePartner(id: string) {
  const db = await partnersDb();
  const result = await db.prepare("DELETE FROM partners WHERE id = ?").bind(id).run();
  return result.meta.changes > 0;
}
