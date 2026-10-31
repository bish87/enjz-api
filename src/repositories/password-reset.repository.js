import { prisma } from "../config/prisma.js";

export function replaceUnusedResetToken(userId, tokenHash, expiresAt) {
  return prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({
      where: { userId, usedAt: null },
    });

    return tx.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  });
}

export function findResetToken(tokenHash) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
}

export function consumeResetToken(tokenHash, passwordHash) {
  return prisma.$transaction(async (tx) => {
    const resetToken = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    return resetToken;
  });
}
