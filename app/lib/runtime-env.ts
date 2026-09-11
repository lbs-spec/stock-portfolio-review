import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

/** Read Pages bindings in production and process.env during local Next.js development. */
export function getRuntimeEnv(): Record<string, unknown> {
  // The normal Next.js dev server emulates edge routes in Node, where the
  // context helper intentionally throws. Keep local `.env` development working
  // while still preferring real Pages bindings in production.
  try {
    const context = getOptionalRequestContext();
    if (context?.env) {
      return context.env as Record<string, unknown>;
    }
  } catch {
    // Fall through to process.env for Node-based local development.
  }

  return process.env as Record<string, unknown>;
}
