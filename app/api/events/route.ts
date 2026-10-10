import { contentDb, isAdmin, mutationOriginAllowed, noStoreJson } from "@/lib/content";
import { collectEvents, deleteEvent, listEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f-]{36}$/;

async function guard(request: Request) {
  if (!await isAdmin()) return noStoreJson({ error: "Somente o responsável pelo site pode alterar os eventos." }, 403);
  if (!mutationOriginAllowed(request)) return noStoreJson({ error: "Origem da solicitação não autorizada." }, 403);
  return null;
}

export async function GET() {
  const result = await listEvents(contentDb());
  return noStoreJson(result, result.available ? 200 : 503);
}

export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  try {
    return noStoreJson(await collectEvents(contentDb()));
  } catch (e) {
    console.error("Events refresh failed", e instanceof Error ? e.message : "error");
    return noStoreJson({ error: "Não foi possível atualizar agora." }, 503);
  }
}

export async function DELETE(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!uuid.test(id)) return noStoreJson({ error: "Evento inválido." }, 400);
  try {
    return await deleteEvent(contentDb(), id) ? noStoreJson({ deleted: true }) : noStoreJson({ error: "Evento não encontrado." }, 404);
  } catch {
    return noStoreJson({ error: "Não foi possível excluir agora." }, 503);
  }
}
