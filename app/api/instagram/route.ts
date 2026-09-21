import { clubEnv, isAdmin, mutationOriginAllowed, noStoreJson } from "@/lib/content";
import { instagramUsername } from "@/lib/club";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!await isAdmin()) return noStoreJson({ error: "Acesso restrito ao responsável pelo site." }, 403);
  if (!mutationOriginAllowed(request)) return noStoreJson({ error: "Origem não autorizada." }, 403);
  try {
    const text = await request.text();
    if (text.length > 1000) return noStoreJson({ error: "Link muito longo." }, 400);
    const body = JSON.parse(text);
    const username = typeof body.instagram === "string" ? instagramUsername(body.instagram) : null;
    if (!username) return noStoreJson({ error: "Informe o link de um perfil ou um @ válido." }, 400);
    const { INSTAGRAM_ACCESS_TOKEN: token, INSTAGRAM_BUSINESS_ACCOUNT_ID: id, INSTAGRAM_API_VERSION: configuredVersion } = clubEnv();
    if (!token || !id) return noStoreJson({ username, error: "O @ foi identificado. A importação de foto, nome e bio ainda precisa de uma conexão autorizada com a Meta. Você pode preencher esses campos abaixo." }, 503);
    if (!/^\d+$/.test(id)) return noStoreJson({ error: "A conexão com o Instagram precisa ser revisada." }, 503);
    const version = configuredVersion && /^v\d+\.\d+$/.test(configuredVersion) ? configuredVersion : "v25.0";
    const api = new URL(`https://graph.facebook.com/${version}/${id}`);
    api.searchParams.set("fields", `business_discovery.username(${username}){username,name,biography,profile_picture_url}`);
    const result = await fetch(api, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
    if (!result.ok) return noStoreJson({ username, error: "A Meta não disponibilizou esse perfil. Confira a conexão e as permissões; contas pessoais ou privadas podem não ser compatíveis. Os campos manuais continuam disponíveis." }, 422);
    const data = await result.json() as { business_discovery?: { username?: string; name?: string; biography?: string; profile_picture_url?: string } };
    const profile = data.business_discovery;
    if (!profile || profile.username?.toLowerCase() !== username) return noStoreJson({ username, error: "Não foi possível identificar esse perfil. Preencha os campos manualmente." }, 422);
    return noStoreJson({ profile: { username, name: (profile.name || "").slice(0, 100), bio: (profile.biography || "").slice(0, 400), photo: profile.profile_picture_url || "" } });
  } catch (error) {
    if (error instanceof SyntaxError) return noStoreJson({ error: "Link inválido." }, 400);
    return noStoreJson({ error: "O Instagram não respondeu agora. Tente novamente ou preencha o perfil manualmente." }, 503);
  }
}
