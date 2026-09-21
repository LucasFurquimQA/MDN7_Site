import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type CloudflareUser = {
  email: string;
};

const ACCESS_EMAIL_HEADER = "cf-access-authenticated-user-email";
const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

export async function getCloudflareUser(): Promise<CloudflareUser | null> {
  const requestHeaders = await headers();
  const email =
    requestHeaders.get(ACCESS_EMAIL_HEADER)?.trim() ||
    readJwtEmail(requestHeaders.get(ACCESS_JWT_HEADER));
  return email ? { email } : null;
}

export async function requireCloudflareUser(returnTo: string): Promise<CloudflareUser> {
  const user = await getCloudflareUser();
  if (user) return user;

  redirect(`/cdn-cgi/access/login?redirect_url=${encodeURIComponent(safeReturnPath(returnTo))}`);
}

function safeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function readJwtEmail(token: string | null): string | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
      email?: unknown;
    };
    return typeof claims.email === "string" ? claims.email.trim() : null;
  } catch {
    return null;
  }
}
