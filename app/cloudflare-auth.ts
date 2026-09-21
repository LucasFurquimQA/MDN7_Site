import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type CloudflareUser = {
  email: string;
};

const ACCESS_EMAIL_HEADER = "cf-access-authenticated-user-email";

export async function getCloudflareUser(): Promise<CloudflareUser | null> {
  const email = (await headers()).get(ACCESS_EMAIL_HEADER)?.trim();
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
