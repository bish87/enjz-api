import { prisma } from "../config/prisma.js";

const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  avatar: true,
  city: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export function findUserByPhone(phone) {
  return prisma.user.findUnique({
    where: { phone },
  });
}

export function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export function createUser(data) {
  return prisma.user.create({
    data,
    select: publicUserSelect,
  });
}

export function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });
}

export function updateUserProfile(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    select: publicUserSelect,
  });
}
