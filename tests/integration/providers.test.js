import "../helpers/env.js";
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createProvider,
  createUser,
  nextPhone,
  resetDb,
  seedBase,
} from "../helpers/db.js";
import { http, login } from "../helpers/http.js";

let fixtures;
let agent;

beforeEach(async () => {
  await resetDb();
  fixtures = await seedBase();
  agent = await http();
});

async function adminToken() {
  return (await login(fixtures.admin.phone)).body.token;
}

async function verifyProvider(userId, status = "VERIFIED", note) {
  const token = await adminToken();

  return agent
    .patch(`/api/v1/admin/providers/${userId}/verification`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status, ...(note && { note }) });
}

describe("public provider discovery", () => {
  it("hides pending providers from the list and detail endpoints", async () => {
    const { user } = await createProvider({
      verified: false,
      categories: [fixtures.categories.plumbing],
      areas: [fixtures.areas.khartoum],
    });

    const list = await agent.get("/api/v1/providers");
    assert.equal(list.status, 200);
    assert.equal(list.body.pagination.total, 0);

    const detail = await agent.get(`/api/v1/providers/${user.id}`);
    assert.equal(detail.status, 404);
  });

  it("shows a provider after admin verification without exposing contact details", async () => {
    const { user } = await createProvider({
      verified: false,
      categories: [fixtures.categories.plumbing],
      areas: [fixtures.areas.khartoum],
    });

    const verification = await verifyProvider(user.id);
    assert.equal(verification.status, 200);
    assert.equal(verification.body.provider.verificationStatus, "VERIFIED");

    const list = await agent.get("/api/v1/providers");
    assert.equal(list.body.pagination.total, 1);
    assert.equal(list.body.data[0].id, user.id);
    assert.equal(list.body.data[0].phone, undefined);
    assert.equal(list.body.data[0].email, undefined);

    const detail = await agent.get(`/api/v1/providers/${user.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.provider.phone, undefined);
  });

  it("filters by category, area, search, name and availability", async () => {
    const plumber = await createProvider({
      firstName: "Ahmed",
      bio: "Expert pipes",
      categories: [fixtures.categories.plumbing],
      areas: [fixtures.areas.khartoum],
    });
    const cleaner = await createProvider({
      firstName: "Mona",
      bio: "Home cleaning",
      categories: [fixtures.categories.cleaning],
      areas: [fixtures.areas.omdurman],
    });
    const pending = await createProvider({
      verified: false,
      categories: [fixtures.categories.plumbing],
      areas: [fixtures.areas.khartoum],
    });
    const nightPlumber = await createProvider({
      firstName: "Sara",
      bio: "Night plumber",
      isAvailable: false,
      categories: [fixtures.categories.plumbing],
      areas: [fixtures.areas.khartoum],
    });

    const all = await agent.get("/api/v1/providers");
    assert.equal(all.body.pagination.total, 3);

    const plumbing = await agent.get(
      `/api/v1/providers?categoryId=${fixtures.categories.plumbing.id}`
    );
    assert.deepEqual(
      plumbing.body.data.map((provider) => provider.id).sort(),
      [plumber.user.id, nightPlumber.user.id].sort()
    );

    const omdurman = await agent.get(
      `/api/v1/providers?areaId=${fixtures.areas.omdurman.id}`
    );
    assert.deepEqual(
      omdurman.body.data.map((provider) => provider.id),
      [cleaner.user.id]
    );

    const byName = await agent.get("/api/v1/providers?search=Ahmed");
    assert.deepEqual(
      byName.body.data.map((provider) => provider.id),
      [plumber.user.id]
    );

    const byBio = await agent.get("/api/v1/providers?search=night");
    assert.deepEqual(
      byBio.body.data.map((provider) => provider.id),
      [nightPlumber.user.id]
    );

    const available = await agent.get("/api/v1/providers?available=true");
    assert.deepEqual(
      available.body.data.map((provider) => provider.id).sort(),
      [plumber.user.id, cleaner.user.id].sort()
    );

    const unavailable = await agent.get("/api/v1/providers?available=false");
    assert.deepEqual(
      unavailable.body.data.map((provider) => provider.id),
      [nightPlumber.user.id]
    );
  });

  it("paginates and caps the page size", async () => {
    for (let index = 0; index < 12; index += 1) {
      await createProvider({
        firstName: `Provider${index}`,
        categories: [fixtures.categories.plumbing],
        areas: [fixtures.areas.khartoum],
      });
    }

    const first = await agent.get("/api/v1/providers?limit=5&page=1");
    assert.equal(first.body.pagination.total, 12);
    assert.equal(first.body.pagination.totalPages, 3);
    assert.equal(first.body.data.length, 5);

    const last = await agent.get("/api/v1/providers?limit=5&page=3");
    assert.equal(last.body.data.length, 2);

    const tooBig = await agent.get("/api/v1/providers?limit=51");
    assert.equal(tooBig.status, 400);
  });
});

describe("provider self-service", () => {
  it("auto-creates a profile and updates allowed fields", async () => {
    const user = await createUser({ role: "PROVIDER" });
    const token = (await login(user.phone)).body.token;

    const profile = await agent
      .get("/api/v1/providers/me")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(profile.status, 200);
    assert.equal(profile.body.provider.verificationStatus, "PENDING");

    const updated = await agent
      .put("/api/v1/providers/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ bio: "  New bio  ", experienceYears: 3, isAvailable: false });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.provider.bio, "New bio");
    assert.equal(updated.body.provider.experienceYears, 3);
    assert.equal(updated.body.provider.isAvailable, false);
  });

  it("rejects customers from provider endpoints", async () => {
    const customer = await createUser();
    const token = (await login(customer.phone)).body.token;

    const response = await agent
      .get("/api/v1/providers/me")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 403);
  });

  it("resets a rejected provider to pending after an edit", async () => {
    const { user } = await createProvider({ verified: false });
    const rejected = await verifyProvider(
      user.id,
      "REJECTED",
      "Add portfolio"
    );

    assert.equal(rejected.body.provider.verificationStatus, "REJECTED");
    assert.equal(rejected.body.provider.verificationNote, "Add portfolio");

    const token = (await login(user.phone)).body.token;
    const updated = await agent
      .put("/api/v1/providers/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ bio: "Portfolio added" });

    assert.equal(updated.body.provider.verificationStatus, "PENDING");
    assert.equal(updated.body.provider.verificationNote, null);
  });

  it("replaces categories and areas and validates ids", async () => {
    const { user } = await createProvider({
      categories: [fixtures.categories.plumbing],
      areas: [fixtures.areas.khartoum],
    });
    const token = (await login(user.phone)).body.token;
    const auth = `Bearer ${token}`;

    const categories = await agent
      .put("/api/v1/providers/me/categories")
      .set("Authorization", auth)
      .send({ categories: [{ categoryId: fixtures.categories.cleaning.id }] });

    assert.equal(categories.status, 200);
    assert.deepEqual(
      categories.body.provider.categories.map((category) => category.id),
      [fixtures.categories.cleaning.id]
    );

    const areas = await agent
      .put("/api/v1/providers/me/areas")
      .set("Authorization", auth)
      .send({ areaIds: [fixtures.areas.omdurman.id] });

    assert.equal(areas.status, 200);
    assert.deepEqual(
      areas.body.provider.areas.map((area) => area.id),
      [fixtures.areas.omdurman.id]
    );

    const invalid = await agent
      .put("/api/v1/providers/me/categories")
      .set("Authorization", auth)
      .send({ categories: [{ categoryId: 999999 }] });
    assert.equal(invalid.status, 400);

    const duplicate = await agent
      .put("/api/v1/providers/me/areas")
      .set("Authorization", auth)
      .send({ areaIds: [fixtures.areas.omdurman.id, fixtures.areas.omdurman.id] });
    assert.equal(duplicate.status, 400);
  });
});

describe("admin provider review", () => {
  it("lists providers by verification status and blocks non-admins", async () => {
    await createProvider({ verified: false });
    await createProvider({ verified: false });
    await createProvider({ verified: true });

    const token = await adminToken();
    const pending = await agent
      .get("/api/v1/admin/providers?status=PENDING")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(pending.status, 200);
    assert.equal(pending.body.providers.length, 2);

    const provider = await createProvider();
    const providerToken = (await login(provider.user.phone)).body.token;
    const forbidden = await agent
      .get("/api/v1/admin/providers")
      .set("Authorization", `Bearer ${providerToken}`);

    assert.equal(forbidden.status, 403);
  });
});
