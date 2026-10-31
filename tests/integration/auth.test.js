import "../helpers/env.js";
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createUser,
  nextPhone,
  prisma,
  resetDb,
  seedBase,
  TEST_PASSWORD,
} from "../helpers/db.js";
import { http, login } from "../helpers/http.js";

beforeEach(async () => {
  await resetDb();
  await seedBase();
});

async function register(overrides = {}) {
  const agent = await http();

  return agent.post("/api/v1/auth/register").send({
    firstName: "Ahmed",
    lastName: "Ali",
    phone: nextPhone(),
    city: "Khartoum",
    password: TEST_PASSWORD,
    ...overrides,
  });
}

describe("POST /auth/register", () => {
  it("registers a customer as ACTIVE with a token and no password hash", async () => {
    const phone = nextPhone();
    const response = await register({ phone, email: "User@Example.COM" });

    assert.equal(response.status, 201);
    assert.equal(response.body.user.phone, phone);
    assert.equal(response.body.user.email, "user@example.com");
    assert.equal(response.body.user.role, "CUSTOMER");
    assert.equal(response.body.user.status, "ACTIVE");
    assert.equal(response.body.user.passwordHash, undefined);
    assert.equal(typeof response.body.token, "string");
  });

  it("normalizes local phone numbers on registration", async () => {
    const response = await register({ phone: "0912345678" });

    assert.equal(response.status, 201);
    assert.equal(response.body.user.phone, "+249912345678");
  });

  it("registers a provider and creates a pending profile", async () => {
    const response = await register({ role: "PROVIDER" });

    assert.equal(response.status, 201);
    assert.equal(response.body.user.role, "PROVIDER");
    assert.equal(response.body.user.status, "ACTIVE");
    assert.equal(typeof response.body.message, "string");

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: response.body.user.id },
    });

    assert.equal(profile.verificationStatus, "PENDING");
  });

  it("rejects duplicate phones with 409", async () => {
    const phone = nextPhone();
    assert.equal((await register({ phone })).status, 201);

    const duplicate = await register({ phone });
    assert.equal(duplicate.status, 409);
  });

  it("rejects duplicate emails case-insensitively with 409", async () => {
    assert.equal((await register({ email: "clash@example.com" })).status, 201);

    const duplicate = await register({ email: "CLASH@example.com" });
    assert.equal(duplicate.status, 409);
  });

  it("returns field-level validation errors", async () => {
    const response = await register({
      firstName: "",
      phone: "123",
      city: "",
      password: "short",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Validation failed");
    assert.ok(response.body.errors.length >= 4);
  });

  it("does not allow role injection", async () => {
    const response = await register({ role: "ADMIN" });
    assert.equal(response.status, 400);
  });
});

describe("POST /auth/login", () => {
  it("logs in an active user", async () => {
    const user = await createUser();
    const response = await login(user.phone);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.id, user.id);
    assert.equal(typeof response.body.token, "string");
  });

  it("rejects a wrong password", async () => {
    const user = await createUser();
    const response = await login(user.phone, "wrong-password");

    assert.equal(response.status, 401);
  });

  it("rejects suspended and pending users", async () => {
    const suspended = await createUser({ status: "SUSPENDED" });
    const pending = await createUser({ status: "PENDING" });

    assert.equal((await login(suspended.phone)).status, 403);
    assert.equal((await login(pending.phone)).status, 403);
  });
});

describe("authentication middleware", () => {
  it("rejects missing, malformed and invalid tokens", async () => {
    const agent = await http();

    assert.equal((await agent.get("/api/v1/auth/me")).status, 401);
    assert.equal(
      (await agent.get("/api/v1/auth/me").set("Authorization", "Token abc"))
        .status,
      401
    );
    assert.equal(
      (
        await agent
          .get("/api/v1/auth/me")
          .set("Authorization", "Bearer not-a-jwt")
      ).status,
      401
    );
  });

  it("returns the current user for a valid token", async () => {
    const registration = await register();
    const agent = await http();

    const response = await agent
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registration.body.token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.id, registration.body.user.id);
  });

  it("blocks a token as soon as the user is suspended", async () => {
    const user = await createUser();
    const loginResponse = await login(user.phone);
    const agent = await http();

    await prisma.user.update({
      where: { id: user.id },
      data: { status: "SUSPENDED" },
    });

    const response = await agent
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginResponse.body.token}`);

    assert.equal(response.status, 403);
  });
});

describe("PATCH /users/profile", () => {
  it("updates allowed fields and trims values", async () => {
    const user = await createUser();
    const loginResponse = await login(user.phone);
    const agent = await http();

    const response = await agent
      .patch("/api/v1/users/profile")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({ firstName: "  Updated  " });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.firstName, "Updated");
  });

  it("rejects role changes and empty bodies", async () => {
    const user = await createUser();
    const loginResponse = await login(user.phone);
    const agent = await http();
    const auth = `Bearer ${loginResponse.body.token}`;

    assert.equal(
      (
        await agent
          .patch("/api/v1/users/profile")
          .set("Authorization", auth)
          .send({ role: "ADMIN" })
      ).status,
      400
    );
    assert.equal(
      (
        await agent
          .patch("/api/v1/users/profile")
          .set("Authorization", auth)
          .send({})
      ).status,
      400
    );
  });
});

describe("unknown routes", () => {
  it("returns a JSON 404", async () => {
    const agent = await http();
    const response = await agent.get("/api/v1/does-not-exist");

    assert.equal(response.status, 404);
    assert.equal(response.body.message, "Route not found");
  });
});
