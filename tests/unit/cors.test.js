import "../helpers/env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isLocalOrigin, isOriginAllowed } from "../../src/config/cors.js";

describe("isLocalOrigin", () => {
  it("accepts localhost, loopback IPv4 and loopback IPv6 on any port", () => {
    for (const origin of [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:3000",
      "http://[::1]:5173",
      "https://localhost:8443",
    ]) {
      assert.equal(isLocalOrigin(origin), true, origin);
    }
  });

  it("rejects non-local and lookalike origins", () => {
    for (const origin of [
      "http://localhost.evil.example:5173",
      "https://evil.example",
      "http://192.168.1.10:5173",
      "null",
      undefined,
    ]) {
      assert.equal(isLocalOrigin(origin), false, String(origin));
    }
  });
});

describe("isOriginAllowed", () => {
  it("allows configured origins and requests without an Origin header", () => {
    assert.equal(isOriginAllowed("http://localhost:5173"), true);
    assert.equal(isOriginAllowed(undefined), true);
  });

  it("does not apply the localhost fallback outside development", () => {
    // Test environment, so an unlisted localhost port must be rejected.
    assert.equal(isOriginAllowed("http://localhost:9999"), false);
    assert.equal(isOriginAllowed("https://evil.example"), false);
  });
});
