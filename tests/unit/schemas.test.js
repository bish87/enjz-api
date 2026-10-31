import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "../../src/validation/auth.schema.js";
import {
  providerCategoriesSchema,
  providerListQuerySchema,
  updateProviderSchema,
} from "../../src/validation/provider.schema.js";
import { createBookingSchema } from "../../src/validation/booking.schema.js";

const validRegistration = {
  firstName: "Ahmed",
  phone: "0912345678",
  city: "Khartoum",
  password: "Passw0rd!",
};

describe("registerSchema", () => {
  it("normalizes local, +249 and 249 phone formats", () => {
    for (const input of ["0912345678", "+249912345678", "249912345678"]) {
      const result = registerSchema.parse({ ...validRegistration, phone: input });
      assert.equal(result.phone, "+249912345678");
    }
  });

  it("lowercases email and turns empty values into null", () => {
    const withEmail = registerSchema.parse({
      ...validRegistration,
      email: "User@Example.COM",
    });
    assert.equal(withEmail.email, "user@example.com");

    const emptyEmail = registerSchema.parse({
      ...validRegistration,
      email: "",
    });
    assert.equal(emptyEmail.email, null);
  });

  it("defaults role to CUSTOMER and accepts PROVIDER", () => {
    assert.equal(registerSchema.parse(validRegistration).role, "CUSTOMER");
    assert.equal(
      registerSchema.parse({ ...validRegistration, role: "PROVIDER" }).role,
      "PROVIDER"
    );
  });

  it("rejects ADMIN self-registration and unknown fields", () => {
    assert.equal(
      registerSchema.safeParse({ ...validRegistration, role: "ADMIN" }).success,
      false
    );
    assert.equal(
      registerSchema.safeParse({ ...validRegistration, status: "ACTIVE" })
        .success,
      false
    );
  });

  it("rejects short passwords, invalid phones and missing names", () => {
    assert.equal(
      registerSchema.safeParse({ ...validRegistration, password: "short" })
        .success,
      false
    );
    assert.equal(
      registerSchema.safeParse({ ...validRegistration, phone: "12345" }).success,
      false
    );
    assert.equal(
      registerSchema.safeParse({ ...validRegistration, firstName: "" }).success,
      false
    );
  });
});

describe("loginSchema", () => {
  it("normalizes the phone number", () => {
    const result = loginSchema.parse({
      phone: "0912345678",
      password: "x",
    });
    assert.equal(result.phone, "+249912345678");
  });

  it("requires a password and rejects unknown fields", () => {
    assert.equal(loginSchema.safeParse({ phone: "0912345678" }).success, false);
    assert.equal(
      loginSchema.safeParse({
        phone: "0912345678",
        password: "x",
        role: "ADMIN",
      }).success,
      false
    );
  });
});

describe("updateProfileSchema", () => {
  it("trims values and converts an empty lastName to null", () => {
    const result = updateProfileSchema.parse({
      firstName: "  Ahmed  ",
      lastName: "",
    });
    assert.equal(result.firstName, "Ahmed");
    assert.equal(result.lastName, null);
  });

  it("rejects empty bodies and unknown fields", () => {
    assert.equal(updateProfileSchema.safeParse({}).success, false);
    assert.equal(
      updateProfileSchema.safeParse({ role: "ADMIN" }).success,
      false
    );
  });
});

describe("provider schemas", () => {
  it("applies list defaults and coerces query params", () => {
    const parsed = providerListQuerySchema.parse({});
    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, 10);

    const filtered = providerListQuerySchema.parse({
      categoryId: "3",
      available: "false",
    });
    assert.equal(filtered.categoryId, 3);
    assert.equal(filtered.available, false);
  });

  it("caps pagination at 50", () => {
    assert.equal(providerListQuerySchema.safeParse({ limit: "51" }).success, false);
    assert.equal(providerListQuerySchema.safeParse({ page: "0" }).success, false);
  });

  it("validates profile updates", () => {
    assert.equal(
      updateProviderSchema.safeParse({ isAvailable: false }).success,
      true
    );
    assert.equal(updateProviderSchema.safeParse({}).success, false);
    assert.equal(
      updateProviderSchema.safeParse({ ratingAvg: 5 }).success,
      false
    );
  });

  it("limits category selections to 10", () => {
    const many = Array.from({ length: 11 }, (_, index) => ({
      categoryId: index + 1,
    }));
    assert.equal(
      providerCategoriesSchema.safeParse({ categories: many }).success,
      false
    );
  });
});

describe("createBookingSchema", () => {
  const base = {
    providerId: 1,
    categoryId: 2,
    areaId: 3,
    address: "Street 12, Khartoum",
    description: "Leaking kitchen sink",
  };

  it("accepts a future scheduledAt and coerces ids", () => {
    const result = createBookingSchema.parse({
      ...base,
      providerId: "1",
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    assert.equal(result.providerId, 1);
    assert.ok(result.scheduledAt instanceof Date);
  });

  it("rejects past dates and short fields", () => {
    assert.equal(
      createBookingSchema.safeParse({
        ...base,
        scheduledAt: "2020-01-01T00:00:00Z",
      }).success,
      false
    );
    assert.equal(
      createBookingSchema.safeParse({
        ...base,
        description: "hi",
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      }).success,
      false
    );
  });

  it("rejects extra fields", () => {
    assert.equal(
      createBookingSchema.safeParse({
        ...base,
        status: "ACCEPTED",
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      }).success,
      false
    );
  });
});
