import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export type CloudflareUser = {
  email: string;
};

type AccessEnv = { CF_ACCESS_TEAM_DOMAIN?: string; CF_ACCESS_AUD?: string };
type Jwk = JsonWebKey & { kid?: string };

const ACCESS_EMAIL_HEADER = "cf-access-authenticated-user-email";
const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";
const CLOCK_SKEW_SECONDS = 60;
const JWKS_TTL_MS = 10 * 60 * 1000;

let jwksCache: { url: string; keys: Jwk[]; expires: number } | null = null;

export async function getCloudflareUser(): Promise<CloudflareUser | null> {
  const requestHeaders = await headers();
  const access = env as unknown as AccessEnv;
  const teamDomain = normalizeTeamDomain(access.CF_ACCESS_TEAM_DOMAIN);
  const audience = access.CF_ACCESS_AUD?.trim();

  if (teamDomain && audience) {
    const email = await verifyAccessJwt(requestHeaders.get(ACCESS_JWT_HEADER), teamDomain, audience);
    return email ? { email } : null;
  }

  // Sem validacao criptografica configurada, o cabecalho so e aceito no ambiente local de desenvolvimento.
  if (process.env.NODE_ENV !== "production") {
    const email = requestHeaders.get(ACCESS_EMAIL_HEADER)?.trim();
    return email ? { email } : null;
  }
  return null;
}

export async function requireCloudflareUser(_returnTo: string): Promise<CloudflareUser | null> {
  return getCloudflareUser();
}

// Motivo não sensível da recusa, exibido no painel para facilitar o diagnóstico.
export async function accessHint(): Promise<string> {
  const access = env as unknown as AccessEnv;
  if (!normalizeTeamDomain(access.CF_ACCESS_TEAM_DOMAIN) || !access.CF_ACCESS_AUD?.trim()) {
    return "Configuração ausente no Worker: defina CF_ACCESS_TEAM_DOMAIN e CF_ACCESS_AUD e publique novamente.";
  }
  const requestHeaders = await headers();
  if (!requestHeaders.get(ACCESS_JWT_HEADER)) {
    return "O Cloudflare Access não enviou o token de login. Confirme que este endereço e caminho estão na aplicação do Access.";
  }
  return "Token do Access recusado. Confira se CF_ACCESS_TEAM_DOMAIN e CF_ACCESS_AUD correspondem à aplicação e se o e-mail é o de ADMIN_EMAIL.";
}

function normalizeTeamDomain(value: string | undefined): string | null {
  const host = value?.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  return host && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
}

async function loadKeys(teamDomain: string): Promise<Jwk[]> {
  const url = `https://${teamDomain}/cdn-cgi/access/certs`;
  if (jwksCache && jwksCache.url === url && jwksCache.expires > Date.now()) return jwksCache.keys;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load Cloudflare Access keys");
  const { keys } = (await response.json()) as { keys?: Jwk[] };
  if (!Array.isArray(keys)) throw new Error("Invalid Cloudflare Access keys");
  jwksCache = { url, keys, expires: Date.now() + JWKS_TTL_MS };
  return keys;
}

async function verifyAccessJwt(token: string | null, teamDomain: string, audience: string): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const header = decodeJson<{ alg?: string; kid?: string }>(parts[0]);
    if (header.alg !== "RS256" || !header.kid) return null;

    const jwk = (await loadKeys(teamDomain)).find(key => key.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;

    const claims = decodeJson<{ iss?: unknown; aud?: unknown; exp?: unknown; nbf?: unknown; email?: unknown }>(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== `https://${teamDomain}`) return null;
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(audience)) return null;
    if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_SECONDS < now) return null;
    if (typeof claims.nbf === "number" && claims.nbf - CLOCK_SKEW_SECONDS > now) return null;
    return typeof claims.email === "string" && claims.email.trim() ? claims.email.trim() : null;
  } catch {
    return null;
  }
}