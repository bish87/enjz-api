import "./env.js";
import bcrypt from "bcrypt";
import { prisma } from "../../src/config/prisma.js";
import { env } from "../../src/config/env.js";

const TABLES = [
  "Review",
  "Booking",
  "ProviderArea",
  "ProviderCategory",
  "ProviderProfile",
  "User",
  "Category",
  "Area",
];

let passwordHashPromise;

export const TEST_PASSWORD = "Passw0rd!";

function passwordHash() {
  passwordHashPromise ??= bcrypt.hash(TEST_PASSWORD, env.BCRYPT_ROUNDS);
  return passwordHashPromise;
}

export async function resetDb() {
  const tableList = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`
  );
}

export async function seedBase() {
  const hash = await passwordHash();

  const admin = await prisma.user.create({
    data: {
      firstName: "Platform",
      lastName: "Admin",
      phone: "+249900000000",
      email: "admin@test.local",
      passwordHash: hash,
      city: "Khartoum",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const [plumbing, cleaning, electrical] = await Promise.all([
    prisma.category.create({ data: { name: "Plumbing" } }),
    prisma.category.create({ data: { name: "Cleaning" } }),
    prisma.category.create({ data: { name: "Electrical" } }),
  ]);

  const [khartoum, omdurman, portSudan] = await Promise.all([
    prisma.area.create({ data: { name: "Khartoum", state: "Khartoum" } }),
    prisma.area.create({ data: { name: "Omdurman", state: "Khartoum" } }),
    prisma.area.create({ data: { name: "Port Sudan", state: "Red Sea" } }),
  ]);

  return {
    admin,
    categories: { plumbing, cleaning, electrical },
    areas: { khartoum, omdurman, portSudan },
  };
}

let phoneCounter = 1_000_000;

export function nextPhone() {
  return `+2499${String(phoneCounter++).padStart(8, "0")}`;
}

export async function createUser(overrides = {}) {
  const {
    firstName = "Test",
    lastName = "User",
    phone = nextPhone(),
    email = null,
    city = "Khartoum",
    role = "CUSTOMER",
    status = "ACTIVE",
    password = TEST_PASSWORD,
  } = overrides;

  return prisma.user.create({
    data: {
      firstName,
      lastName,
      phone,
      email,
      city,
      role,
      status,
      passwordHash: await bcrypt.hash(password, env.BCRYPT_ROUNDS),
    },
  });
}

export async function createProvider({
  verified = true,
  isAvailable = true,
  categories = [],
  areas = [],
  bio = "Test provider",
  ...userOverrides
} = {}) {
  const user = await createUser({ ...userOverrides, role: "PROVIDER" });

  const profile = await prisma.providerProfile.create({
    data: {
      userId: user.id,
      bio,
      experienceYears: 5,
      startingPrice: 10000,
      isAvailable,
      verificationStatus: verified ? "VERIFIED" : "PENDING",
    },
  });

  for (const item of categories) {
    const categoryId = typeof item === "object" ? item.id : item;
    await prisma.providerCategory.create({
      data: {
        providerId: profile.id,
        categoryId,
        price: typeof item === "object" ? (item.price ?? null) : null,
      },
    });
  }

  for (const item of areas) {
    const areaId = typeof item === "object" ? item.id : item;
    await prisma.providerArea.create({
      data: { providerId: profile.id, areaId },
    });
  }

  return { user, profile };
}

export { prisma };
