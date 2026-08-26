/**
 * Shared API key for the SEO Copilot backend.
 *
 * Every /api/seo-copilot/* route requires a matching `x-api-key` header
 * (see PR #33); without it the backend returns 401. Supplied at build time via
 * NEXT_PUBLIC_SEO_COPILOT_API_KEY.
 *
 * Not a true secret: this app runs in the browser, so the value is readable in
 * devtools regardless of how it is injected. It closes the anonymous-caller
 * hole, nothing more.
 */

const configuredKey: string | undefined =
  process.env.NEXT_PUBLIC_SEO_COPILOT_API_KEY || undefined;

export function authHeaders(): Record<string, string> {
  return configuredKey ? { "x-api-key": configuredKey } : {};
}

export function jsonHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...authHeaders() };
}
