import "../helpers/env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { http } from "../helpers/http.js";
import { openapiSpec } from "../../src/docs/openapi.js";

describe("API documentation", () => {
  it("serves the raw OpenAPI description", async () => {
    const agent = await http();
    const response = await agent.get("/api/v1/openapi.json");

    assert.equal(response.status, 200);
    assert.equal(response.body.openapi, "3.1.0");
    assert.equal(response.body.info.title, "enjz API");
    assert.ok(response.body.paths["/auth/login"]);
    assert.equal(
      Object.keys(response.body.paths).length,
      Object.keys(openapiSpec.paths).length
    );
  });

  it("serves Swagger UI with a CSP that allows its inline assets", async () => {
    const agent = await http();
    const response = await agent.get("/api/v1/docs/");

    assert.equal(response.status, 200);
    assert.match(response.text, /swagger-ui/i);

    const csp = response.headers["content-security-policy"];
    assert.match(csp, /script-src[^;]*'unsafe-inline'/);
    assert.match(csp, /style-src[^;]*'unsafe-inline'/);
  });
});
