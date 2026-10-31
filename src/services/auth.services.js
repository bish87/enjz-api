import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import {
  consumeResetToken,
  replaceUnusedResetToken,
} from "../repositories/password-reset.repository.js";
import {
  createUser,
  findUserAuthById,
  findUserByEmail,
  findUserByPhone,
  incrementTokenVersion,
  updateUserPassword,
} from "../repositories/user.repository.js";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors.js";
import { createResetToken, hashResetToken } from "../utils/tokens.js";
import { sendPasswordResetEmail } from "./email.services.js";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export async function registerUser(data) {
  const existingUser = await findUserByPhone(data.phone);

  if (existingUser) {
    throw new ConflictError("Phone already registered");
  }

  if (data.email) {
    const existingEmail = await findUserByEmail(data.email);

    if (existingEmail) {
      throw new ConflictError("Email already registered");
    }
  }

  const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

  const user = await createUser(
    {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      city: data.city,
      passwordHash,
      role: data.role,
      status: "ACTIVE",
    },
    { createProviderProfile: data.role === "PROVIDER" }
  );

  return user;
}

export function logoutUser(userId) {
  return incrementTokenVersion(userId);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await findUserAuthById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!matches) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await updateUserPassword(userId, passwordHash);

  return { message: "Password changed. Please sign in again." };
}

export async function requestPasswordReset(phone) {
  const user = await findUserByPhone(phone);

  if (!user || !user.email) {
    return;
  }

  const token = createResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await replaceUnusedResetToken(user.id, hashResetToken(token), expiresAt);

  try {
    await sendPasswordResetEmail({ to: user.email, token });
  } catch (error) {
    logger.error(
      { err: error, userId: user.id },
      "failed to send password reset email"
    );
  }
}

export async function resetPassword(token, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  const resetToken = await consumeResetToken(
    hashResetToken(token),
    passwordHash
  );

  if (!resetToken) {
    throw new ValidationError("Invalid or expired reset token");
  }

  return { message: "Password reset successful. Please sign in again." };
}

export async function adminResetPassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

  try {
    return await updateUserPassword(userId, passwordHash);
  } catch (error) {
    if (error.code === "P2025") {
      throw new NotFoundError("User not found");
    }
    throw error;
  }
}
