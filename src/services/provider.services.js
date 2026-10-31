import {
  countAreasByIds,
  countCategoriesByIds,
  findAdminProviders,
  findProviderProfileByUserId,
  findPublicProviderById,
  findPublicProviders,
  replaceProviderAreas,
  replaceProviderCategories,
  setProviderVerification,
  upsertProviderProfile,
} from "../repositories/provider.repository.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

export function toPublicProvider(profile) {
  return {
    id: profile.userId,
    firstName: profile.user.firstName,
    lastName: profile.user.lastName,
    avatar: profile.user.avatar,
    city: profile.user.city,
    bio: profile.bio,
    experienceYears: profile.experienceYears,
    startingPrice: profile.startingPrice,
    isAvailable: profile.isAvailable,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    categories: profile.categories.map(({ category, price }) => ({
      id: category.id,
      name: category.name,
      price,
    })),
    areas: profile.areas.map(({ area }) => area),
  };
}

export function toAdminProvider(profile) {
  return {
    id: profile.userId,
    user: {
      id: profile.user.id,
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      phone: profile.user.phone,
      email: profile.user.email,
      avatar: profile.user.avatar,
      city: profile.user.city,
      status: profile.user.status,
    },
    bio: profile.bio,
    experienceYears: profile.experienceYears,
    startingPrice: profile.startingPrice,
    isAvailable: profile.isAvailable,
    verificationStatus: profile.verificationStatus,
    verificationNote: profile.verificationNote,
    verifiedAt: profile.verifiedAt,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    categories: profile.categories.map(({ category, price }) => ({
      id: category.id,
      name: category.name,
      price,
    })),
    areas: profile.areas.map(({ area }) => area),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export async function getMyProviderProfile(userId) {
  const profile = await getOrCreateProfile(userId);
  return toAdminProvider(profile);
}

async function getOrCreateProfile(userId) {
  const existing = await findProviderProfileByUserId(userId);

  if (existing) {
    return existing;
  }

  return upsertProviderProfile(userId, {});
}

export async function updateMyProviderProfile(userId, data) {
  const current = await findProviderProfileByUserId(userId);
  const update = { ...data };

  if (
    !current ||
    current.verificationStatus === "REJECTED" ||
    current.verificationStatus === "UNVERIFIED"
  ) {
    update.verificationStatus = "PENDING";
    update.verificationNote = null;
    update.verifiedAt = null;
  }

  const profile = await upsertProviderProfile(userId, update);
  return toAdminProvider(profile);
}

export async function updateMyCategories(userId, categories) {
  const ids = categories.map((item) => item.categoryId);

  if (new Set(ids).size !== ids.length) {
    throw new ValidationError("Duplicate category ids are not allowed");
  }

  if (ids.length > 0) {
    const count = await countCategoriesByIds(ids);
    if (count !== ids.length) {
      throw new ValidationError("One or more category ids do not exist");
    }
  }

  const profile = await getOrCreateProfile(userId);
  const updated = await replaceProviderCategories(profile.id, categories);
  return toAdminProvider(updated);
}

export async function updateMyAreas(userId, areaIds) {
  if (new Set(areaIds).size !== areaIds.length) {
    throw new ValidationError("Duplicate area ids are not allowed");
  }

  if (areaIds.length > 0) {
    const count = await countAreasByIds(areaIds);
    if (count !== areaIds.length) {
      throw new ValidationError("One or more area ids do not exist");
    }
  }

  const profile = await getOrCreateProfile(userId);
  const updated = await replaceProviderAreas(profile.id, areaIds);
  return toAdminProvider(updated);
}

export async function listPublicProviders(query) {
  const { page, limit, ...filters } = query;
  const { providers, total } = await findPublicProviders({
    ...filters,
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data: providers.map(toPublicProvider),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export async function getPublicProvider(userId) {
  const profile = await findPublicProviderById(userId);

  if (!profile) {
    throw new NotFoundError("Provider not found");
  }

  return toPublicProvider(profile);
}

export async function listProvidersForAdmin(status) {
  const profiles = await findAdminProviders(status);
  return profiles.map(toAdminProvider);
}

export async function verifyProvider(userId, { status, note }) {
  try {
    const profile = await setProviderVerification(userId, {
      verificationStatus: status,
      verificationNote: status === "REJECTED" ? (note ?? null) : null,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
    });

    return toAdminProvider(profile);
  } catch (error) {
    if (error.code === "P2025") {
      throw new NotFoundError("Provider not found");
    }
    throw error;
  }
}
