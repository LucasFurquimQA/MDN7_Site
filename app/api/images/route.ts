import { imageBucket, isAdmin, mutationOriginAllowed, noStoreJson } from "@/lib/content";
import { hasValidImageSignature, imageExtension, isAllowedImageType, MAX_IMAGE_SIZE } from "@/lib/image-storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!await isAdmin()) return noStoreJson({ error: "Acesso restrito ao responsável pelo site." }, 403);
  if (!mutationOriginAllowed(request)) return noStoreJson({ error: "Origem não autorizada." }, 403);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_SIZE + 64_000) {
    return noStoreJson({ error: "A foto deve ter no máximo 1,5 MB." }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return noStoreJson({ error: "Não foi possível ler o arquivo enviado." }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return noStoreJson({ error: "Selecione uma foto para enviar." }, 400);
  if (!isAllowedImageType(file.type)) return noStoreJson({ error: "Envie uma imagem JPEG, PNG, WebP ou GIF." }, 415);
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) return noStoreJson({ error: "A foto deve ter no máximo 1,5 MB." }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidImageSignature(bytes, file.type)) return noStoreJson({ error: "O conteúdo do arquivo não corresponde a uma imagem válida." }, 415);

  const key = `photos/${crypto.randomUUID()}.${imageExtension(file.type)}`;
  try {
    await imageBucket().put(key, bytes, { httpMetadata: { contentType: file.type } });
    return noStoreJson({ url: `/media?key=${key}` });
  } catch (error) {
    console.error("Image upload failed", error instanceof Error ? error.message : "R2 error");
    return noStoreJson({ error: "Não foi possível armazenar a foto. Verifique se o bucket R2 está configurado." }, 503);
  }
}
