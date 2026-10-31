import "./helpers/env.js";
import pg from "pg";
import { execSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const databaseName = new URL(databaseUrl).pathname.slice(1);

const adminUrl = new URL(databaseUrl);
adminUrl.pathname = "/postgres";
adminUrl.search = "";

const client = new pg.Client({ connectionString: adminUrl.toString() });

try {
  await client.connect();

  const { rows } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName]
  );

  if (rows.length === 0) {
    await client.query(`CREATE DATABASE "${databaseName}"`);
    console.log(`Created test database ${databaseName}`);
  }
} finally {
  await client.end();
}

console.log("Applying migrations to test database...");
execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
