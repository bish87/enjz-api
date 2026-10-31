import { describe, it } from "node:test";
import assert from "node:assert/strict";

import "./../helpers/env.js";
import { toBooking } from "../../src/services/booking.services.js";
import { toPublicProvider } from "../../src/services/provider.services.js";

const person = {
  id: 1,
  firstName: "Ahmed",
  lastName: "Ali",
  avatar: null,
  city: "Khartoum",
  phone: "+249912345678",
  email: "ahmed@example.com",
};

const profile = {
  userId: person.id,
  bio: "Plumber",
  experienceYears: 8,
  startingPrice: 15000,
  isAvailable: true,
  ratingAvg: 4.5,
  ratingCount: 10,
  user: person,
  categories: [{ category: { id: 2, name: "Plumbing" }, price: 15000 }],
  areas: [{ area: { id: 3, name: "Khartoum", state: "Khartoum" } }],
};

const booking = {
  id: 9,
  status: "PENDING",
  address: "Street 12",
  description: "Leaking sink",
  scheduledAt: new Date("2026-11-05T10:00:00Z"),
  agreedPrice: null,
  cancelledReason: null,
  createdAt: new Date("2026-10-31T10:00:00Z"),
  updatedAt: new Date("2026-10-31T10:00:00Z"),
  customer: person,
  provider: person,
  category: { id: 2, name: "Plumbing" },
  area: { id: 3, name: "Khartoum", state: "Khartoum" },
  review: null,
};

describe("toPublicProvider", () => {
  it("never exposes phone or email", () => {
    const result = toPublicProvider(profile);

    assert.equal(result.phone, undefined);
    assert.equal(result.email, undefined);
    assert.equal(result.id, 1);
    assert.deepEqual(result.categories, [
      { id: 2, name: "Plumbing", price: 15000 },
    ]);
    assert.deepEqual(result.areas, [
      { id: 3, name: "Khartoum", state: "Khartoum" },
    ]);
  });
});

describe("toBooking", () => {
  it("hides contact details when not revealed", () => {
    const result = toBooking(booking);

    assert.equal(result.customer.phone, undefined);
    assert.equal(result.provider.email, undefined);
  });

  it("reveals contact details when requested", () => {
    const result = toBooking(booking, { revealContact: true });

    assert.equal(result.customer.phone, "+249912345678");
    assert.equal(result.provider.email, "ahmed@example.com");
  });

  it("keeps booking metadata", () => {
    const result = toBooking(booking);

    assert.equal(result.id, 9);
    assert.equal(result.status, "PENDING");
    assert.deepEqual(result.category, { id: 2, name: "Plumbing" });
  });
});
