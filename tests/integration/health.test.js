import "../helpers/env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { http } from "../helpers/http.js";

describe("GET /health", () => {
  it("reports the API and database as healthy", async () => {
    const agent = await http();
    const response = await agent.get("/api/v1/health");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: "ok", db: "up" });
  });
});
