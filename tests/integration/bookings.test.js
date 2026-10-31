import "../helpers/env.js";
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createProvider,
  createUser,
  resetDb,
  seedBase,
} from "../helpers/db.js";
import { http, loginToken } from "../helpers/http.js";

let fixtures;
let agent;
let customer;
let customerToken;
let otherCustomer;
let otherCustomerToken;
let provider;
let providerToken;
let otherProvider;
let otherProviderToken;
let adminToken;

beforeEach(async () => {
  await resetDb();
  fixtures = await seedBase();
  agent = await http();

  customer = await createUser({ firstName: "Customer" });
  otherCustomer = await createUser({ firstName: "Other" });
  provider = await createProvider({
    firstName: "Provider",
    categories: [fixtures.categories.plumbing],
    areas: [fixtures.areas.khartoum],
  });
  otherProvider = await createProvider({
    firstName: "OtherProvider",
    categories: [fixtures.categories.plumbing],
    areas: [fixtures.areas.khartoum],
  });

  customerToken = await loginToken(customer.phone);
  otherCustomerToken = await loginToken(otherCustomer.phone);
  providerToken = await loginToken(provider.user.phone);
  otherProviderToken = await loginToken(otherProvider.user.phone);
  adminToken = await loginToken(fixtures.admin.phone);
});

function bookingBody(overrides = {}) {
  return {
    providerId: provider.user.id,
    categoryId: fixtures.categories.plumbing.id,
    areaId: fixtures.areas.khartoum.id,
    address: "Street 12, Khartoum",
    description: "Leaking kitchen sink",
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    ...overrides,
  };
}

async function createBooking(overrides = {}) {
  return agent
    .post("/api/v1/bookings")
    .set("Authorization", `Bearer ${customerToken}`)
    .send(bookingBody(overrides));
}

describe("POST /bookings", () => {
  it("creates a pending booking without revealing contacts", async () => {
    const response = await createBooking();

    assert.equal(response.status, 201);
    assert.equal(response.body.booking.status, "PENDING");
    assert.equal(response.body.booking.customer.id, customer.id);
    assert.equal(response.body.booking.provider.id, provider.user.id);
    assert.equal(response.body.booking.customer.phone, undefined);
    assert.equal(response.body.booking.provider.phone, undefined);
  });

  it("rejects self-booking, past dates, wrong category and wrong area", async () => {
    assert.equal(
      (await createBooking({ providerId: customer.id })).status,
      400
    );
    assert.equal(
      (await createBooking({ scheduledAt: "2020-01-01T00:00:00Z" })).status,
      400
    );
    assert.equal(
      (await createBooking({ categoryId: fixtures.categories.cleaning.id }))
        .status,
      400
    );
    assert.equal(
      (await createBooking({ areaId: fixtures.areas.omdurman.id })).status,
      400
    );
  });

  it("rejects unverified and unavailable providers", async () => {
    const unverified = await createProvider({
      verified: false,
      categories: [fixtures.categories.plumbing],
      areas: [fixtures.areas.khartoum],
    });
    const unavailable = await createProvider({
      isAvailable: false,
      categories: [fixtures.categories.plumbing],
      areas: [fixtures.areas.khartoum],
    });

    assert.equal(
      (await createBooking({ providerId: unverified.user.id })).status,
      404
    );
    assert.equal(
      (await createBooking({ providerId: unavailable.user.id })).status,
      409
    );
  });

  it("blocks providers from creating bookings", async () => {
    const response = await agent
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${providerToken}`)
      .send(bookingBody());

    assert.equal(response.status, 403);
  });
});

describe("booking visibility", () => {
  it("shows bookings only to their participants", async () => {
    const created = await createBooking();
    const id = created.body.booking.id;

    const asCustomer = await agent
      .get("/api/v1/bookings/me")
      .set("Authorization", `Bearer ${customerToken}`);
    assert.equal(asCustomer.body.pagination.total, 1);

    const asProvider = await agent
      .get("/api/v1/bookings/me")
      .set("Authorization", `Bearer ${providerToken}`);
    assert.equal(asProvider.body.pagination.total, 1);

    const asOtherCustomer = await agent
      .get(`/api/v1/bookings/${id}`)
      .set("Authorization", `Bearer ${otherCustomerToken}`);
    assert.equal(asOtherCustomer.status, 404);
  });

  it("does not reveal contacts while pending", async () => {
    const created = await createBooking();
    const response = await agent
      .get(`/api/v1/bookings/${created.body.booking.id}`)
      .set("Authorization", `Bearer ${customerToken}`);

    assert.equal(response.body.booking.provider.phone, undefined);
  });
});

describe("provider transitions", () => {
  it("accepts a booking, records the price and reveals contacts", async () => {
    const created = await createBooking();
    const id = created.body.booking.id;

    const accepted = await agent
      .patch(`/api/v1/bookings/${id}/accept`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({ agreedPrice: 20000 });

    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.booking.status, "ACCEPTED");
    assert.equal(accepted.body.booking.agreedPrice, 20000);
    assert.equal(accepted.body.booking.customer.phone, customer.phone);
    assert.equal(accepted.body.booking.provider.phone, provider.user.phone);

    const second = await agent
      .patch(`/api/v1/bookings/${id}/accept`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({});
    assert.equal(second.status, 409);
  });

  it("hides a booking from a different provider", async () => {
    const created = await createBooking();
    const response = await agent
      .patch(`/api/v1/bookings/${created.body.booking.id}/accept`)
      .set("Authorization", `Bearer ${otherProviderToken}`)
      .send({});

    assert.equal(response.status, 404);
  });

  it("declines a booking with a reason", async () => {
    const created = await createBooking();
    const id = created.body.booking.id;

    const declined = await agent
      .patch(`/api/v1/bookings/${id}/decline`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({ reason: "Not available" });

    assert.equal(declined.status, 200);
    assert.equal(declined.body.booking.status, "DECLINED");
    assert.equal(declined.body.booking.cancelledReason, "Not available");

    const acceptAfterDecline = await agent
      .patch(`/api/v1/bookings/${id}/accept`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({});
    assert.equal(acceptAfterDecline.status, 409);
  });

  it("completes an accepted booking and blocks further changes", async () => {
    const created = await createBooking();
    const id = created.body.booking.id;

    await agent
      .patch(`/api/v1/bookings/${id}/accept`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({});

    const completed = await agent
      .patch(`/api/v1/bookings/${id}/complete`)
      .set("Authorization", `Bearer ${providerToken}`);

    assert.equal(completed.status, 200);
    assert.equal(completed.body.booking.status, "COMPLETED");

    const cancelAfterComplete = await agent
      .patch(`/api/v1/bookings/${id}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({});
    assert.equal(cancelAfterComplete.status, 409);
  });
});

describe("customer cancellation", () => {
  it("cancels a pending booking with a reason", async () => {
    const created = await createBooking();
    const id = created.body.booking.id;

    const cancelled = await agent
      .patch(`/api/v1/bookings/${id}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ reason: "Changed plans" });

    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.booking.status, "CANCELLED");
    assert.equal(cancelled.body.booking.cancelledReason, "Changed plans");

    const acceptAfterCancel = await agent
      .patch(`/api/v1/bookings/${id}/accept`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({});
    assert.equal(acceptAfterCancel.status, 409);
  });

  it("blocks the customer from accepting a booking", async () => {
    const created = await createBooking();
    const response = await agent
      .patch(`/api/v1/bookings/${created.body.booking.id}/accept`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({});

    assert.equal(response.status, 403);
  });
});

describe("booking lists and admin", () => {
  it("filters by status and paginates", async () => {
    const first = await createBooking();
    await createBooking();

    await agent
      .patch(`/api/v1/bookings/${first.body.booking.id}/accept`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({});

    const filtered = await agent
      .get("/api/v1/bookings/me?status=PENDING")
      .set("Authorization", `Bearer ${customerToken}`);
    assert.equal(filtered.body.pagination.total, 1);

    const paged = await agent
      .get("/api/v1/bookings/me?limit=1&page=2")
      .set("Authorization", `Bearer ${customerToken}`);
    assert.equal(paged.body.data.length, 1);
    assert.equal(paged.body.pagination.total, 2);
    assert.equal(paged.body.pagination.totalPages, 2);
  });

  it("lets admins list all bookings with contacts and blocks non-admins", async () => {
    await createBooking();

    const admin = await agent
      .get("/api/v1/admin/bookings")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(admin.status, 200);
    assert.equal(admin.body.pagination.total, 1);
    assert.equal(admin.body.data[0].customer.phone, customer.phone);

    const forbidden = await agent
      .get("/api/v1/admin/bookings")
      .set("Authorization", `Bearer ${customerToken}`);
    assert.equal(forbidden.status, 403);
  });
});
