import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export async function sendPasswordResetEmail({ to, token }) {
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
    logger.warn(
      { to },
      "password reset email skipped: RESEND_API_KEY or FROM_EMAIL is not configured"
    );
    return false;
  }

  const baseUrl = env.FRONTEND_URL.replace(/\/$/, "");
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [to],
      subject: "Reset your enjz password",
      text: `Use this link to reset your password. It expires in 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Use this link to reset your password. It expires in 30 minutes:</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend responded with ${response.status}: ${body}`);
  }

  return true;
}
