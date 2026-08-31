import { describe, it, expect } from "vitest";
import * as apiKeyModule from "./apiKey";
import { authHeaders, jsonHeaders, SHARED_CLIENT_KEY } from "./apiKey";

/**
 * Lockstep guard for the 2026-07-27 outage.
 *
 * This copy of the shared key was previously pinned by nothing at all: this
 * repo had no test runner, so the backend and plugin could be edited together
 * and the Notebook would silently keep sending the old value, 401ing on every
 * call with every other suite green.
 *
 * Asserted against the raw literal, never the imported constant, or both sides
 * of the assertion move together and the test proves nothing.
 */
describe("shared client key", () => {
  it("matches the literal the backend accepts", () => {
    expect(SHARED_CLIENT_KEY).toBe("seo-copilot-public-client-key-v1");
  });

  it("is sent on every backend call", () => {
    expect(authHeaders()["x-api-key"]).toBe("seo-copilot-public-client-key-v1");
    expect(jsonHeaders()["x-api-key"]).toBe("seo-copilot-public-client-key-v1");
    expect(jsonHeaders()["Content-Type"]).toBe("application/json");
  });

  it("exposes no configuration path that could hold a real secret", () => {
    expect(Object.keys(apiKeyModule).sort()).toEqual([
      "SHARED_CLIENT_KEY",
      "authHeaders",
      "jsonHeaders",
    ]);
  });
});
