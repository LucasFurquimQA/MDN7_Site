import { imageBucket } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !/^photos\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif)$/.test(key)) {
    return new Response("Imagem não encontrada.", { status: 404 });
  }

  try {
    const object = await imageBucket().get(key);
    if (!object) return new Response("Imagem não encontrada.", { status: 404 });
    return new Response(object.body, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "ETag": object.httpEtag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Image read failed", error instanceof Error ? error.message : "R2 error");
    return new Response("Armazenamento de imagens indisponível.", { status: 503 });
  }
}
