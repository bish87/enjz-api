import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://127.0.0.1:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  RESEND_API_KEY: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  FROM_EMAIL: z
    .union([
      z.string().email("FROM_EMAIL must be a valid email"),
      z.literal(""),
    ])
    .optional()
    .transform((value) => value || undefined),
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
