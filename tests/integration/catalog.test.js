import "../helpers/env.js";
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { createUser, resetDb, seedBase } from "../helpers/db.js";
import { http, loginToken } from "../helpers/http.js";

let fixtures;
let agent;
let adminToken;
let customerToken;

beforeEach(async () => {
  await resetDb();
  fixtures = await seedBase();
  agent = await http();
  adminToken = await loginToken(fixtures.admin.phone);

  const customer = await createUser();
  customerToken = await loginToken(customer.phone);
});

describe("categories", () => {
  it("lists categories publicly", async () => {
    const response = await agent.get("/api/v1/categories");

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.categories.map((category) => category.name),
      ["Cleaning", "Electrical", "Plumbing"]
    );
  });

  it("allows admins to create and delete categories", async () => {
    const created = await agent
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "  Moving  " });

    assert.equal(created.status, 201);
    assert.equal(created.body.category.name, "Moving");

    const deleted = await agent
      .delete(`/api/v1/categories/${created.body.category.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(deleted.status, 200);

    const again = await agent
      .delete(`/api/v1/categories/${created.body.category.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(again.status, 404);
  });

  it("rejects duplicate names and non-admin writes", async () => {
    const duplicate = await agent
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Plumbing" });
    assert.equal(duplicate.status, 409);

    const forbidden = await agent
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "Tutoring" });
    assert.equal(forbidden.status, 403);

    const invalid = await agent
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "" });
    assert.equal(invalid.status, 400);
  });
});

describe("areas", () => {
  it("lists areas publicly and filters by state", async () => {
    const all = await agent.get("/api/v1/areas");
    assert.equal(all.status, 200);
    assert.equal(all.body.areas.length, 3);

    const redSea = await agent.get("/api/v1/areas?state=Red%20Sea");
    assert.equal(redSea.body.areas.length, 1);
    assert.equal(redSea.body.areas[0].name, "Port Sudan");
  });

  it("allows admins to create and delete areas", async () => {
    const created = await agent
      .post("/api/v1/areas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Wad Madani", state: "Gezira" });

    assert.equal(created.status, 201);
    assert.equal(created.body.area.name, "Wad Madani");

    const deleted = await agent
      .delete(`/api/v1/areas/${created.body.area.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(deleted.status, 200);

    const again = await agent
      .delete(`/api/v1/areas/${created.body.area.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(again.status, 404);
  });

  it("rejects duplicate areas and non-admin writes", async () => {
    const duplicate = await agent
      .post("/api/v1/areas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Khartoum", state: "Khartoum" });
    assert.equal(duplicate.status, 409);

    const forbidden = await agent
      .post("/api/v1/areas")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "Atbara", state: "River Nile" });
    assert.equal(forbidden.status, 403);

    const invalid = await agent
      .post("/api/v1/areas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "" });
    assert.equal(invalid.status, 400);
  });
});
