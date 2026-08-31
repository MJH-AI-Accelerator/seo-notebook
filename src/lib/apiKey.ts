/**
 * Shared API key for the SEO Copilot backend.
 *
 * Every /api/seo-copilot/* route requires a matching `x-api-key` header
 * (see PR #33); without it the backend returns 401. A provisioned key can be
 * supplied at build time via NEXT_PUBLIC_SEO_COPILOT_API_KEY; otherwise the
 * shared client key below is sent.
 *
 * Not a true secret: this app runs in the browser, so the value is readable in
 * devtools regardless of how it is injected. It closes the anonymous-caller
 * hole, nothing more.
 *
 * The default matters: NEXT_PUBLIC_SEO_COPILOT_API_KEY is not provisioned on
 * the deployment, and sending no header at all is what kept every surface
 * 401ing from 2026-07-27. Must stay in lockstep with SHARED_CLIENT_KEY in the
 * backend's src/lib/seo-copilot/sharedKey.ts.
 */
export const SHARED_CLIENT_KEY = "seo-copilot-public-client-key-v1";

const configuredKey: string =
  process.env.NEXT_PUBLIC_SEO_COPILOT_API_KEY || SHARED_CLIENT_KEY;

export function authHeaders(): Record<string, string> {
  return { "x-api-key": configuredKey };
}

export function jsonHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...authHeaders() };
}
