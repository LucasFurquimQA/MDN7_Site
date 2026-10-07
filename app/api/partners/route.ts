import { isAdmin, mutationOriginAllowed, noStoreJson } from "@/lib/content";
import { createPartner, deletePartner, listPartners, partnerSchema, updatePartner } from "@/lib/partners";

export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f-]{36}$/;

async function guard(request: Request) {
  if (!await isAdmin()) return noStoreJson({ error: "Somente o responsável pelo site pode alterar os parceiros." }, 403);
  if (!mutationOriginAllowed(request)) return noStoreJson({ error: "Origem da solicitação não autorizada." }, 403);
  return null;
}

async function readBody(request: Request): Promise<{ body: Record<string, unknown>; error?: undefined } | { body?: undefined; error: Response }> {
  if (!request.headers.get("content-type")?.includes("application/json")) return { error: noStoreJson({ error: "Envie os dados em JSON." }, 415) };
  try {
    const text = await request.text();
    if (text.length > 20_000) return { error: noStoreJson({ error: "O conteúdo excede o limite permitido." }, 413) };
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return { error: noStoreJson({ error: "Revise os campos." }, 400) };
    return { body };
  } catch {
    return { error: noStoreJson({ error: "Não foi possível ler os dados enviados." }, 400) };
  }
}

const saveFailed = () => noStoreJson({ error: "Não foi possível salvar agora. Tente novamente." }, 503);

export async function GET() {
  const result = await listPartners();
  return noStoreJson(result, result.available ? 200 : 503);
}

export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const { body, error } = await readBody(request);
  if (error) return error;
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ error: parsed.error.issues[0]?.message || "Revise os campos." }, 400);
  try {
    return noStoreJson({ partner: await createPartner(parsed.data) }, 201);
  } catch (e) {
    console.error("Partner create failed", e instanceof Error ? e.message : "Database error");
    return saveFailed();
  }
}

export async function PUT(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const { body, error } = await readBody(request);
  if (error) return error;
  const id = typeof body.id === "string" ? body.id : "";
  if (!uuid.test(id)) return noStoreJson({ error: "Parceiro inválido." }, 400);
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ error: parsed.error.issues[0]?.message || "Revise os campos." }, 400);
  try {
    const partner = await updatePartner(id, parsed.data);
    return partner ? noStoreJson({ partner }) : noStoreJson({ error: "Parceiro não encontrado." }, 404);
  } catch (e) {
    console.error("Partner update failed", e instanceof Error ? e.message : "Database error");
    return saveFailed();
  }
}

export async function DELETE(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!uuid.test(id)) return noStoreJson({ error: "Parceiro inválido." }, 400);
  try {
    return await deletePartner(id) ? noStoreJson({ deleted: true }) : noStoreJson({ error: "Parceiro não encontrado." }, 404);
  } catch (e) {
    console.error("Partner delete failed", e instanceof Error ? e.message : "Database error");
    return noStoreJson({ error: "Não foi possível excluir agora. Tente novamente." }, 503);
  }
}
