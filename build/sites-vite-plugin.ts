// Local Cloudflare Access development adapter and build asset copier.
import { access, cp, mkdir, rm } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const localCookieName = "__cloudflare_local_auth";
const accessEmailHeader = "cf-access-authenticated-user-email";
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const localAddresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const accessLoginPath = "/cdn-cgi/access/login";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export function cloudflareAccessDev({
  mockAuth = true,
  adminEmail = "",
}: { mockAuth?: boolean; adminEmail?: string } = {}): Plugin {
  let root = process.cwd();
  let command: "build" | "serve" = "build";

  return {
    name: "cloudflare-access-dev",
    configResolved(config) {
      root = config.root;
      command = config.command;
    },
    configureServer(server) {
      if (!mockAuth) return;
      const secure = Boolean(server.config.server.https);

      server.config.logger.info(`Cloudflare Access local sign-in: ${adminEmail || "ADMIN_EMAIL não definido"}`);
      server.middlewares.use((request, response, next) => {
        for (const name of Object.keys(request.headers)) {
          if (name === accessEmailHeader) {
            removeHeader(request, name);
          }
        }

        let authority: URL;
        let url: URL;
        try {
          authority = new URL(
            `${secure ? "https" : "http"}://${request.headers.host}`,
          );
          url = new URL(request.url ?? "/", authority);
        } catch {
          if ((request.url ?? "/").startsWith(accessLoginPath)) {
            respond(response, 403);
          } else {
            next();
          }
          return;
        }

        const hostname = authority.hostname
          .replace(/^\[|\]$/g, "")
          .toLowerCase();
        if (
          !localHosts.has(hostname) ||
          !localAddresses.has(request.socket.remoteAddress ?? "") ||
          url.origin !== authority.origin
        ) {
          if (url.pathname.startsWith(accessLoginPath)) respond(response, 403);
          else next();
          return;
        }

        const cookies = (request.headers.cookie ?? "")
          .split(";")
          .map((cookie) => cookie.trim())
          .filter(Boolean);
        const signInCookies = cookies
          .filter((cookie) => cookie.startsWith(`${localCookieName}=`))
          .map((cookie) => cookie.slice(localCookieName.length + 1));
        const applicationCookies = cookies.filter(
          (cookie) => !cookie.startsWith(`${localCookieName}=`),
        );
        if (applicationCookies.length !== cookies.length) {
          removeHeader(request, "cookie");
          if (applicationCookies.length) {
            setHeader(request, "cookie", applicationCookies.join("; "));
          }
        }

        if (url.pathname !== accessLoginPath) {
          if (signInCookies.length === 1 && signInCookies[0] === "1" && adminEmail) {
            setHeader(request, accessEmailHeader, adminEmail);
          }
          next();
          return;
        }
        const returnTo = safeReturn(url.searchParams.get("redirect_url"));
        response.statusCode = 302;
        response.setHeader("Cache-Control", "private, no-store");
        response.setHeader("Location", returnTo);
        response.setHeader(
          "Set-Cookie",
          `${localCookieName}=1; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
        );
        response.end();
      });
    },
    async closeBundle() {
      if (command !== "build") return;

      const outputDirectory = resolve(root, "dist", ".cloudflare");
      const drizzleSource = resolve(root, "drizzle");

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });

      if (await exists(drizzleSource)) {
        await cp(drizzleSource, resolve(outputDirectory, "drizzle"), {
          recursive: true,
        });
      }
    },
  };
}

function removeHeader(request: IncomingMessage, name: string): void {
  delete request.headers[name];
  for (let index = request.rawHeaders.length - 2; index >= 0; index -= 2) {
    if (request.rawHeaders[index]?.toLowerCase() === name) {
      request.rawHeaders.splice(index, 2);
    }
  }
}

function setHeader(
  request: IncomingMessage,
  name: string,
  value: string,
): void {
  removeHeader(request, name);
  request.headers[name] = value;
  request.rawHeaders.push(name, value);
}

function respond(response: ServerResponse, status: number): void {
  response.statusCode = status;
  response.setHeader("Cache-Control", "private, no-store");
  response.end();
}

function safeReturn(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost" || url.pathname === accessLoginPath) {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
