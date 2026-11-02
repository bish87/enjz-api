import { env } from "./env.js";

const LOCAL_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

export function isLocalOrigin(origin) {
  return typeof origin === "string" && LOCAL_ORIGIN.test(origin);
}

export function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  if (env.CORS_ORIGINS.includes(origin)) {
    return true;
  }

  // Vite may fall back to another port when 5173 is busy. Keep local
  // development usable without allowing arbitrary origins in production.
  return env.NODE_ENV === "development" && isLocalOrigin(origin);
}

export function corsOrigin(origin, callback) {
  callback(null, isOriginAllowed(origin));
}
