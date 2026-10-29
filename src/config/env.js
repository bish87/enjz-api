import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://127.0.0.1:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".") || "env"}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
