import { prisma } from "../config/prisma.js";

const reviewInclude = {
  customer: {
    select: {
      id: true,
      firstName: true,
    },
  },
};

async function providerAggregate(tx, providerId) {
  const aggregate = await tx.review.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return {
    ratingAvg: aggregate._avg.rating ?? 0,
    ratingCount: aggregate._count._all,
  };
}

export function findReviewByBookingId(bookingId) {
  return prisma.review.findUnique({
    where: { bookingId },
    include: reviewInclude,
  });
}

export function findReviewById(id) {
  return prisma.review.findUnique({
    where: { id },
    include: reviewInclude,
  });
}

export function findProviderReviews(providerId, { skip, take }) {
  return prisma.$transaction([
    prisma.review.findMany({
      where: { providerId },
      include: reviewInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
    prisma.review.count({ where: { providerId } }),
  ]);
}

export function createReviewWithAggregate(data) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data,
      include: reviewInclude,
    });

    const aggregate = await providerAggregate(tx, data.providerId);

    await tx.providerProfile.update({
      where: { userId: data.providerId },
      data: aggregate,
    });

    return review;
  });
}

export function deleteReviewWithAggregate(id) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({ where: { id } });

    if (!review) {
      return null;
    }

    await tx.review.delete({ where: { id } });

    const aggregate = await providerAggregate(tx, review.providerId);

    await tx.providerProfile.update({
      where: { userId: review.providerId },
      data: aggregate,
    });

    return review;
  });
}
