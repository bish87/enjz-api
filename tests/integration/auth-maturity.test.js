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
import { createResetToken, hashResetToken } from "../../src/utils/tokens.js";

const NEW_PASSWORD = "NewPassw0rd!";

let fixtures;
let agent;

beforeEach(async () => {
  await resetDb();
  fixtures = await seedBase();
  agent = await http();
});

describe("login lockout", () => {
  it("locks a phone and IP after five failed attempts", async () => {
    const user = await createUser();

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      assert.equal((await login(user.phone, "wrong-password")).status, 401);
    }

    const fifth = await login(user.phone, "wrong-password");
    assert.equal(fifth.status, 429);

    const correctWhileLocked = await login(user.phone);
    assert.equal(correctWhileLocked.status, 429);

    const record = await prisma.failedLoginAttempt.findFirst({
      where: { phone: user.phone },
    });
    assert.equal(record.attempts, 5);
  });

  it("allows login again once the window expires, and clears the record", async () => {
    const user = await createUser();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await login(user.phone, "wrong-password");
    }
    assert.equal((await login(user.phone)).status, 429);

    const record = await prisma.failedLoginAttempt.findFirst({
      where: { phone: user.phone },
    });

    await prisma.failedLoginAttempt.update({
      where: { id: record.id },
      data: { windowStart: new Date(Date.now() - 16 * 60 * 1000) },
    });

    const response = await login(user.phone);
    assert.equal(response.status, 200);
    assert.equal(
      await prisma.failedLoginAttempt.count({ where: { phone: user.phone } }),
      0
    );
  });

  it("scopes lockouts to the phone and IP pair", async () => {
    const lockedUser = await createUser();
    const otherUser = await createUser();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await login(lockedUser.phone, "wrong-password");
    }

    assert.equal((await login(lockedUser.phone)).status, 429);
    assert.equal((await login(otherUser.phone)).status, 200);
  });

  it("clears failed attempts after a successful login", async () => {
    const user = await createUser();

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await login(user.phone, "wrong-password");
    }

    assert.equal((await login(user.phone)).status, 200);
    assert.equal(
      await prisma.failedLoginAttempt.count({ where: { phone: user.phone } }),
      0
    );
  });
});

describe("token revocation", () => {
  it("invalidates all sessions on logout", async () => {
    const user = await createUser();
    const loggedIn = await login(user.phone);
    const token = loggedIn.body.token;
    const auth = `Bearer ${token}`;

    assert.equal(
      (await agent.get("/api/v1/auth/me").set("Authorization", auth)).status,
      200
    );

    const logout = await agent
      .post("/api/v1/auth/logout")
      .set("Authorization", auth);

    assert.equal(logout.status, 200);
    assert.equal(
      (await agent.get("/api/v1/auth/me").set("Authorization", auth)).status,
      401
    );

    const again = await login(user.phone);
    assert.equal(again.status, 200);
    assert.equal(
      (
        await agent
          .get("/api/v1/auth/me")
          .set("Authorization", `Bearer ${again.body.token}`)
      ).status,
      200
    );
  });

  it("requires authentication for logout", async () => {
    const response = await agent.post("/api/v1/auth/logout");
    assert.equal(response.status, 401);
  });
});

describe("POST /auth/password", () => {
  it("changes the password and revokes existing tokens", async () => {
    const user = await createUser();
    const loggedIn = await login(user.phone);
    const token = loggedIn.body.token;
    const auth = `Bearer ${token}`;

    const wrongCurrent = await agent
      .post("/api/v1/auth/password")
      .set("Authorization", auth)
      .send({ currentPassword: "wrong-password", newPassword: NEW_PASSWORD });
    assert.equal(wrongCurrent.status, 401);
    assert.equal(
      (await agent.get("/api/v1/auth/me").set("Authorization", auth)).status,
      200
    );

    const changed = await agent
      .post("/api/v1/auth/password")
      .set("Authorization", auth)
      .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD });
    assert.equal(changed.status, 200);

    assert.equal(
      (await agent.get("/api/v1/auth/me").set("Authorization", auth)).status,
      401
    );
    assert.equal((await login(user.phone, TEST_PASSWORD)).status, 401);
    assert.equal((await login(user.phone, NEW_PASSWORD)).status, 200);
  });

  it("validates the new password", async () => {
    const user = await createUser();
    const token = (await login(user.phone)).body.token;
    const auth = `Bearer ${token}`;

    assert.equal(
      (
        await agent
          .post("/api/v1/auth/password")
          .set("Authorization", auth)
          .send({ currentPassword: TEST_PASSWORD, newPassword: "short" })
      ).status,
      400
    );

    assert.equal(
      (
        await agent
          .post("/api/v1/auth/password")
          .set("Authorization", auth)
          .send({
            currentPassword: TEST_PASSWORD,
            newPassword: TEST_PASSWORD,
          })
      ).status,
      400
    );
  });
});

describe("POST /auth/forgot-password", () => {
  it("always returns 200 and only stores a token for accounts with an email", async () => {
    const withEmail = await createUser({ email: "reset@example.com" });
    const withoutEmail = await createUser();
    const unknownPhone = nextPhone();

    const existing = await agent
      .post("/api/v1/auth/forgot-password")
      .send({ phone: withEmail.phone });
    const noEmail = await agent
      .post("/api/v1/auth/forgot-password")
      .send({ phone: withoutEmail.phone });
    const unknown = await agent
      .post("/api/v1/auth/forgot-password")
      .send({ phone: unknownPhone });

    assert.equal(existing.status, 200);
    assert.equal(noEmail.status, 200);
    assert.equal(unknown.status, 200);
    assert.equal(existing.body.message, unknown.body.message);

    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: withEmail.id },
    });
    assert.equal(tokens.length, 1);
    assert.ok(tokens[0].expiresAt.getTime() > Date.now());
    assert.ok(tokens[0].tokenHash !== "reset-token");

    assert.equal(
      await prisma.passwordResetToken.count({
        where: { userId: withoutEmail.id },
      }),
      0
    );
  });

  it("replaces any previous unused token", async () => {
    const user = await createUser({ email: "reset@example.com" });

    await agent
      .post("/api/v1/auth/forgot-password")
      .send({ phone: user.phone });
    await agent
      .post("/api/v1/auth/forgot-password")
      .send({ phone: user.phone });

    assert.equal(
      await prisma.passwordResetToken.count({ where: { userId: user.id } }),
      1
    );
  });
});

describe("POST /auth/reset-password", () => {
  it("consumes a valid token, changes the password and revokes tokens", async () => {
    const user = await createUser({ email: "reset@example.com" });
    const oldToken = (await login(user.phone)).body.token;
    const token = createResetToken();

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const response = await agent
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: NEW_PASSWORD });

    assert.equal(response.status, 200);
    assert.equal(
      (
        await agent
          .get("/api/v1/auth/me")
          .set("Authorization", `Bearer ${oldToken}`)
      ).status,
      401
    );
    assert.equal((await login(user.phone, TEST_PASSWORD)).status, 401);
    assert.equal((await login(user.phone, NEW_PASSWORD)).status, 200);

    const reused = await agent
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: NEW_PASSWORD });
    assert.equal(reused.status, 400);
  });

  it("rejects invalid, expired and missing tokens", async () => {
    const user = await createUser();
    const expired = createResetToken();

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(expired),
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    assert.equal(
      (
        await agent
          .post("/api/v1/auth/reset-password")
          .send({ token: expired, newPassword: NEW_PASSWORD })
      ).status,
      400
    );

    assert.equal(
      (
        await agent
          .post("/api/v1/auth/reset-password")
          .send({ token: "unknown-token", newPassword: NEW_PASSWORD })
      ).status,
      400
    );

    assert.equal(
      (
        await agent
          .post("/api/v1/auth/reset-password")
          .send({ newPassword: NEW_PASSWORD })
      ).status,
      400
    );
  });
});

describe("POST /admin/users/:id/reset-password", () => {
  it("lets admins reset a password without email access", async () => {
    const user = await createUser();
    const userToken = (await login(user.phone)).body.token;
    const adminToken = (await login(fixtures.admin.phone)).body.token;
    const auth = `Bearer ${adminToken}`;

    const forbidden = await agent
      .post(`/api/v1/admin/users/${user.id}/reset-password`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ newPassword: NEW_PASSWORD });
    assert.equal(forbidden.status, 403);

    const missing = await agent
      .post("/api/v1/admin/users/999999/reset-password")
      .set("Authorization", auth)
      .send({ newPassword: NEW_PASSWORD });
    assert.equal(missing.status, 404);

    const reset = await agent
      .post(`/api/v1/admin/users/${user.id}/reset-password`)
      .set("Authorization", auth)
      .send({ newPassword: NEW_PASSWORD });
    assert.equal(reset.status, 200);

    assert.equal(
      (
        await agent
          .get("/api/v1/auth/me")
          .set("Authorization", `Bearer ${userToken}`)
      ).status,
      401
    );
    assert.equal((await login(user.phone, TEST_PASSWORD)).status, 401);
    assert.equal((await login(user.phone, NEW_PASSWORD)).status, 200);
  });

  it("validates the password and admin access", async () => {
    const user = await createUser();
    const adminToken = (await login(fixtures.admin.phone)).body.token;

    const invalid = await agent
      .post(`/api/v1/admin/users/${user.id}/reset-password`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ newPassword: "short" });
    assert.equal(invalid.status, 400);

    const anonymous = await agent
      .post(`/api/v1/admin/users/${user.id}/reset-password`)
      .send({ newPassword: NEW_PASSWORD });
    assert.equal(anonymous.status, 401);
  });
});
