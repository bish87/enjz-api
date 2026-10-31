import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma.js";

const categories = [
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "AC Repair",
  "Moving",
  "Tutoring",
  "Beauty",
  "Car Repair",
];

const areas = [
  { name: "Khartoum", state: "Khartoum" },
  { name: "Omdurman", state: "Khartoum" },
  { name: "Bahri", state: "Khartoum" },
  { name: "Wad Madani", state: "Gezira" },
  { name: "Port Sudan", state: "Red Sea" },
  { name: "Kassala", state: "Kassala" },
  { name: "El Obeid", state: "North Kordofan" },
  { name: "Nyala", state: "South Darfur" },
  { name: "El Fasher", state: "North Darfur" },
  { name: "Atbara", state: "River Nile" },
  { name: "Dongola", state: "Northern" },
  { name: "Singa", state: "Sennar" },
  { name: "Gedaref", state: "Gedaref" },
  { name: "Kosti", state: "White Nile" },
  { name: "Damazin", state: "Blue Nile" },
];

async function main() {
  const adminPhone = process.env.ADMIN_PHONE;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPhone || !adminPassword) {
    throw new Error(
      "ADMIN_PHONE and ADMIN_PASSWORD must be set to seed the admin user"
    );
  }

  if (adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash,
    },
    create: {
      firstName: "Platform",
      lastName: "Admin",
      phone: adminPhone,
      email: process.env.ADMIN_EMAIL || null,
      passwordHash,
      city: "Khartoum",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`Admin ready: ${admin.phone}`);

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const area of areas) {
    await prisma.area.upsert({
      where: { name_state: area },
      update: {},
      create: area,
    });
  }

  console.log(
    `Seeded ${categories.length} categories and ${areas.length} areas`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
