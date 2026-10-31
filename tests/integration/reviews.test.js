import "../helpers/env.js";
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createProvider,
  createUser,
  prisma,
  resetDb,
  seedBase,
} from "../helpers/db.js";
import { http, loginToken } from "../helpers/http.js";

let fixtures;
let agent;
let customer;
let customerToken;
let otherCustomerToken;
let provider;
let providerToken;
let adminToken;

beforeEach(async () => {
  await resetDb();
  fixtures = await seedBase();
  agent = await http();

  customer = await createUser({ firstName: "Customer" });
  const otherCustomer = await createUser({ firstName: "Other" });
  provider = await createProvider({
    firstName: "Provider",
    categories: [fixtures.categories.plumbing],
    areas: [fixtures.areas.khartoum],
  });

  customerToken = await loginToken(customer.phone);
  otherCustomerToken = await loginToken(otherCustomer.phone);
  providerToken = await loginToken(provider.user.phone);
  adminToken = await loginToken(fixtures.admin.phone);
});

function bookingBody() {
  return {
    providerId: provider.user.id,
    categoryId: fixtures.categories.plumbing.id,
    areaId: fixtures.areas.khartoum.id,
    address: "Street 12, Khartoum",
    description: "Leaking kitchen sink",
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

async function createCompletedBooking() {
  const created = await agent
    .post("/api/v1/bookings")
    .set("Authorization", `Bearer ${customerToken}`)
    .send(bookingBody());

  const id = created.body.booking.id;

  await agent
    .patch(`/api/v1/bookings/${id}/accept`)
    .set("Authorization", `Bearer ${providerToken}`)
    .send({ agreedPrice: 20000 });

  await agent
    .patch(`/api/v1/bookings/${id}/complete`)
    .set("Authorization", `Bearer ${providerToken}`);

  return id;
}

async function createReview(bookingId, overrides = {}) {
  return agent
    .post(`/api/v1/bookings/${bookingId}/review`)
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ rating: 5, comment: "Great work", ...overrides });
}

describe("POST /bookings/:id/review", () => {
  it("creates a review and updates the provider aggregate", async () => {
    const bookingId = await createCompletedBooking();
    const response = await createReview(bookingId);

    assert.equal(response.status, 201);
    assert.equal(response.body.review.bookingId, bookingId);
    assert.equal(response.body.review.rating, 5);
    assert.equal(response.body.review.comment, "Great work");
    assert.deepEqual(response.body.review.customer, {
      firstName: customer.firstName,
    });

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: provider.user.id },
    });
    assert.equal(profile.ratingAvg, 5);
    assert.equal(profile.ratingCount, 1);

    const detail = await agent.get(`/api/v1/providers/${provider.user.id}`);
    assert.equal(detail.body.provider.ratingAvg, 5);
    assert.equal(detail.body.provider.ratingCount, 1);
  });

  it("rejects reviews for bookings that are not completed", async () => {
    const created = await agent
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${customerToken}`)
      .send(bookingBody());

    const response = await createReview(created.body.booking.id);
    assert.equal(response.status, 409);
  });

  it("only lets the booking customer review", async () => {
    const bookingId = await createCompletedBooking();

    const otherCustomer = await agent
      .post(`/api/v1/bookings/${bookingId}/review`)
      .set("Authorization", `Bearer ${otherCustomerToken}`)
      .send({ rating: 5 });
    assert.equal(otherCustomer.status, 404);

    const providerAttempt = await agent
      .post(`/api/v1/bookings/${bookingId}/review`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({ rating: 5 });
    assert.equal(providerAttempt.status, 403);
  });

  it("allows only one review per booking", async () => {
    const bookingId = await createCompletedBooking();

    assert.equal((await createReview(bookingId)).status, 201);

    const duplicate = await createReview(bookingId, { rating: 4 });
    assert.equal(duplicate.status, 409);
  });

  it("validates rating and comment", async () => {
    const bookingId = await createCompletedBooking();

    for (const rating of [0, 6, 4.5, "not-a-number"]) {
      assert.equal((await createReview(bookingId, { rating })).status, 400);
    }

    assert.equal(
      (await createReview(bookingId, { comment: "x".repeat(501) })).status,
      400
    );

    assert.equal(
      (
        await agent
          .post(`/api/v1/bookings/${bookingId}/review`)
          .set("Authorization", `Bearer ${customerToken}`)
          .send({ rating: 5, providerId: 999 })
      ).status,
      400
    );
  });
});

describe("GET /providers/:id/reviews", () => {
  it("returns public paginated reviews with first names only", async () => {
    const firstBooking = await createCompletedBooking();
    const secondBooking = await createCompletedBooking();

    await createReview(firstBooking, { rating: 4, comment: "Good" });
    await createReview(secondBooking, { rating: 5, comment: "Excellent" });

    const page = await agent.get(
      `/api/v1/providers/${provider.user.id}/reviews?limit=1&page=1`
    );

    assert.equal(page.status, 200);
    assert.equal(page.body.data.length, 1);
    assert.equal(page.body.pagination.total, 2);
    assert.equal(page.body.pagination.totalPages, 2);
    assert.equal(page.body.data[0].comment, "Excellent");
    assert.deepEqual(page.body.data[0].customer, {
      firstName: customer.firstName,
    });
    assert.equal(page.body.data[0].customer.phone, undefined);
    assert.equal(page.body.data[0].customer.email, undefined);

    const secondPage = await agent.get(
      `/api/v1/providers/${provider.user.id}/reviews?limit=1&page=2`
    );
    assert.equal(secondPage.body.data[0].comment, "Good");
  });

  it("returns 404 for unknown or non-public providers", async () => {
    const unknown = await agent.get("/api/v1/providers/999999/reviews");
    assert.equal(unknown.status, 404);

    const pending = await createProvider({
      verified: false,
      categories: [fixtures.categories.plumbing],
      areas: [fixtures.areas.khartoum],
    });
    const notPublic = await agent.get(
      `/api/v1/providers/${pending.user.id}/reviews`
    );
    assert.equal(notPublic.status, 404);
  });
});

describe("DELETE /admin/reviews/:id", () => {
  it("deletes a review, recomputes the aggregate and returns 404 when missing", async () => {
    const firstBooking = await createCompletedBooking();
    const secondBooking = await createCompletedBooking();

    const first = await createReview(firstBooking, { rating: 4 });
    await createReview(secondBooking, { rating: 5 });

    let profile = await prisma.providerProfile.findUnique({
      where: { userId: provider.user.id },
    });
    assert.equal(profile.ratingAvg, 4.5);
    assert.equal(profile.ratingCount, 2);

    const deleted = await agent
      .delete(`/api/v1/admin/reviews/${first.body.review.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.review.id, first.body.review.id);

    profile = await prisma.providerProfile.findUnique({
      where: { userId: provider.user.id },
    });
    assert.equal(profile.ratingAvg, 5);
    assert.equal(profile.ratingCount, 1);

    const missing = await agent
      .delete(`/api/v1/admin/reviews/${first.body.review.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(missing.status, 404);
  });

  it("blocks non-admin users", async () => {
    const bookingId = await createCompletedBooking();
    const review = await createReview(bookingId);

    const response = await agent
      .delete(`/api/v1/admin/reviews/${review.body.review.id}`)
      .set("Authorization", `Bearer ${customerToken}`);

    assert.equal(response.status, 403);
  });
});
