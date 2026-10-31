import { prisma } from "../config/prisma.js";

export function findFailedLogin(phone, ip) {
  return prisma.failedLoginAttempt.findUnique({
    where: { phone_ip: { phone, ip } },
  });
}

export function createFailedLogin(data) {
  return prisma.failedLoginAttempt.create({ data });
}

export function updateFailedLogin(id, data) {
  return prisma.failedLoginAttempt.update({
    where: { id },
    data,
  });
}

export function deleteFailedLogins(phone, ip) {
  return prisma.failedLoginAttempt.deleteMany({
    where: { phone, ip },
  });
}
