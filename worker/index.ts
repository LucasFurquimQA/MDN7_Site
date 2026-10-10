import handler from "vinext/server/fetch-handler";
import { collectEvents } from "../lib/events";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

export default {
  async scheduled(_controller: unknown, env: { DB: D1Database }, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    ctx.waitUntil(collectEvents(env.DB).catch(error => console.error("Events collection failed", error instanceof Error ? error.message : "error")));
  },
  async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    const response = await (handler as { fetch: (...args: unknown[]) => Promise<Response> }).fetch(request, env, ctx);
    if (response.status === 101) return response;

    const secured = new Response(response.body, response);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!secured.headers.has(name)) secured.headers.set(name, value);
    }
    return secured;
  },
};