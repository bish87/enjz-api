import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

function skipped() {
  return env.NODE_ENV === "test";
}

function tooManyRequests(req, res) {
  return res.status(429).json({
    message: "Too many requests. Please try again later.",
  });
}

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: skipped,
  handler: tooManyRequests,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: skipped,
  handler: tooManyRequests,
});
