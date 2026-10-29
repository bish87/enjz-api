import { prisma } from "../config/prisma.js";

export function getCategoryByName(name) {
  return prisma.category.findFirst({
    where: { name },
  });
}

export function findCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export function createCategory(data) {
  return prisma.category.create({
    data,
  });
}

export function deleteCategory(id) {
  return prisma.category.delete({
    where: { id },
  });
}
