import { prisma } from "../config/prisma.js";

export function findAreas(state) {
  return prisma.area.findMany({
    where: state ? { state: { equals: state, mode: "insensitive" } } : {},
    orderBy: [{ state: "asc" }, { name: "asc" }],
  });
}

export function findAreaById(id) {
  return prisma.area.findUnique({ where: { id } });
}

export function createArea(data) {
  return prisma.area.create({ data });
}

export function deleteArea(id) {
  return prisma.area.delete({ where: { id } });
}
