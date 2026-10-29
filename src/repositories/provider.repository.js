import { prisma } from "../config/prisma.js";

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  avatar: true,
  city: true,
  status: true,
};

const profileInclude = {
  user: { select: userSelect },
  categories: {
    select: {
      price: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: { categoryId: "asc" },
  },
  areas: {
    select: {
      area: { select: { id: true, name: true, state: true } },
    },
  },
};

export function findProviderProfileByUserId(userId) {
  return prisma.providerProfile.findUnique({
    where: { userId },
    include: profileInclude,
  });
}

export function upsertProviderProfile(userId, data) {
  return prisma.providerProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
    include: profileInclude,
  });
}

export function setProviderVerification(userId, data) {
  return prisma.providerProfile.update({
    where: { userId },
    data,
    include: profileInclude,
  });
}

export async function replaceProviderCategories(providerId, categories) {
  return prisma.$transaction(async (tx) => {
    await tx.providerCategory.deleteMany({ where: { providerId } });

    if (categories.length > 0) {
      await tx.providerCategory.createMany({
        data: categories.map((item) => ({
          providerId,
          categoryId: item.categoryId,
          price: item.price ?? null,
        })),
      });
    }

    return tx.providerProfile.findUnique({
      where: { id: providerId },
      include: profileInclude,
    });
  });
}

export async function replaceProviderAreas(providerId, areaIds) {
  return prisma.$transaction(async (tx) => {
    await tx.providerArea.deleteMany({ where: { providerId } });

    if (areaIds.length > 0) {
      await tx.providerArea.createMany({
        data: areaIds.map((areaId) => ({ providerId, areaId })),
      });
    }

    return tx.providerProfile.findUnique({
      where: { id: providerId },
      include: profileInclude,
    });
  });
}

export async function findPublicProviders(filters) {
  const { categoryId, areaId, search, available, skip, take } = filters;

  const where = {
    verificationStatus: "VERIFIED",
    ...(available !== undefined ? { isAvailable: available } : {}),
    ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    ...(areaId ? { areas: { some: { areaId } } } : {}),
    user: {
      status: "ACTIVE",
      role: "PROVIDER",
    },
    ...(search
      ? {
          OR: [
            { bio: { contains: search, mode: "insensitive" } },
            { user: { firstName: { contains: search, mode: "insensitive" } } },
            { user: { lastName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [providers, total] = await prisma.$transaction([
    prisma.providerProfile.findMany({
      where,
      include: profileInclude,
      orderBy: [{ ratingAvg: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.providerProfile.count({ where }),
  ]);

  return { providers, total };
}

export function findPublicProviderById(userId) {
  return prisma.providerProfile.findFirst({
    where: {
      userId,
      verificationStatus: "VERIFIED",
      user: { status: "ACTIVE", role: "PROVIDER" },
    },
    include: profileInclude,
  });
}

export function findAdminProviders(status) {
  return prisma.providerProfile.findMany({
    where: status ? { verificationStatus: status } : {},
    include: profileInclude,
    orderBy: [{ createdAt: "asc" }],
  });
}

export function countCategoriesByIds(ids) {
  return prisma.category.count({ where: { id: { in: ids } } });
}

export function countAreasByIds(ids) {
  return prisma.area.count({ where: { id: { in: ids } } });
}
