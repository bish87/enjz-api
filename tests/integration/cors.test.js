import "../helpers/env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { http } from "../helpers/http.js";

function preflight(agent, origin) {
  return agent
    .options("/api/v1/auth/login")
    .set("Origin", origin)
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "content-type");
}

describe("CORS preflight", () => {
  it("allows a configured browser origin", async () => {
    const agent = await http();
    const response = await preflight(agent, "http://localhost:5173");

    assert.equal(response.status, 204);
    assert.equal(
      response.headers["access-control-allow-origin"],
      "http://localhost:5173"
    );
    assert.match(response.headers["access-control-allow-methods"], /POST/);
    assert.match(
      response.headers["access-control-allow-headers"],
      /Content-Type/i
    );
  });

  it("does not send CORS headers for an unknown origin", async () => {
    const agent = await http();
    const response = await preflight(agent, "https://evil.example");

    assert.equal(response.headers["access-control-allow-origin"], undefined);
  });
});
