import {
  createFailedLogin,
  deleteFailedLogins,
  findFailedLogin,
  updateFailedLogin,
} from "../repositories/login-attempt.repository.js";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_LOGIN_ATTEMPTS = 5;

function windowExpired(record) {
  return Date.now() - record.windowStart.getTime() >= LOGIN_WINDOW_MS;
}

export async function isLoginLocked(phone, ip) {
  const record = await findFailedLogin(phone, ip);

  if (!record || windowExpired(record)) {
    return false;
  }

  return record.attempts >= MAX_LOGIN_ATTEMPTS;
}

export async function recordFailedLogin(phone, ip) {
  const now = new Date();
  const record = await findFailedLogin(phone, ip);

  if (!record) {
    const created = await createFailedLogin({
      phone,
      ip,
      attempts: 1,
      windowStart: now,
    });
    return created.attempts;
  }

  if (windowExpired(record)) {
    const reset = await updateFailedLogin(record.id, {
      attempts: 1,
      windowStart: now,
    });
    return reset.attempts;
  }

  const updated = await updateFailedLogin(record.id, {
    attempts: { increment: 1 },
  });
  return updated.attempts;
}

export function clearFailedLogins(phone, ip) {
  return deleteFailedLogins(phone, ip);
}
