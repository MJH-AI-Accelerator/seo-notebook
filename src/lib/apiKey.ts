/**
 * Shared API key for the SEO Copilot backend.
 *
 * Every /api/seo-copilot/* route requires a matching `x-api-key` header
 * (see PR #33); without it the backend returns 401.
 *
 * There is deliberately no override. This app runs in the browser and Next
 * inlines NEXT_PUBLIC_* values into the public bundle, so an earlier
 * NEXT_PUBLIC_SEO_COPILOT_API_KEY branch would have published the genuine
 * server credential to anyone who fetched the chunk the moment someone
 * "provisioned it properly". The only key a browser client can hold is one that
 * is already public.
 *
 * Must stay in lockstep with SHARED_CLIENT_KEY in the backend's
 * src/lib/seo-copilot/sharedKey.ts. apiKey.test.ts pins this exact literal.
 */
export const SHARED_CLIENT_KEY = "seo-copilot-public-client-key-v1";

export function authHeaders(): Record<string, string> {
  return { "x-api-key": SHARED_CLIENT_KEY };
}

export function jsonHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...authHeaders() };
}
