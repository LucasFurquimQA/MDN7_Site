import { contentDb, contentSchema, isAdmin, mutationOriginAllowed, noStoreJson, normalizeContent, readContent } from "@/lib/content";
export const dynamic = "force-dynamic";
export async function GET() {
  const result = await readContent();
  return noStoreJson(result, result.available ? 200 : 503);
}
export async function PUT(request: Request) {
  if (!await isAdmin()) return noStoreJson({ error: "Somente o responsável pelo site pode salvar alterações." }, 403);
  if (!mutationOriginAllowed(request)) return noStoreJson({ error: "Origem da solicitação não autorizada." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return noStoreJson({ error: "Envie os dados em JSON." }, 415);
  try {
    const text = await request.text();
    if (text.length > 60000) return noStoreJson({ error: "O conteúdo excede o limite permitido." }, 413);
    const parsed = contentSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return noStoreJson({ error: parsed.error.issues[0]?.message || "Revise os campos." }, 400);
    const content = normalizeContent(parsed.data);
    await contentDb().prepare("INSERT INTO site_content (id, content, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at").bind(1, JSON.stringify(content), new Date().toISOString()).run();
    return noStoreJson({ content, saved: true });
  } catch (error) {
    if (error instanceof SyntaxError) return noStoreJson({ error: "Não foi possível ler os dados enviados." }, 400);
    console.error("Club content save failed", error instanceof Error ? error.message : "Database error");
    return noStoreJson({ error: "Não foi possível salvar agora. Seus dados continuam no formulário; tente novamente." }, 503);
  }
}
