import { findBookingById } from "../repositories/booking.repository.js";
import { findPublicProviderById } from "../repositories/provider.repository.js";
import {
  createReviewWithAggregate,
  deleteReviewWithAggregate,
  findProviderReviews,
} from "../repositories/review.repository.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";

function toReview(review) {
  return {
    id: review.id,
    bookingId: review.bookingId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    customer: {
      firstName: review.customer.firstName,
    },
  };
}

export async function createReview(user, bookingId, data) {
  const booking = await findBookingById(bookingId);

  if (!booking || booking.customerId !== user.id) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.status !== "COMPLETED") {
    throw new ConflictError("Only completed bookings can be reviewed");
  }

  if (booking.review) {
    throw new ConflictError("Booking has already been reviewed");
  }

  try {
    const review = await createReviewWithAggregate({
      bookingId: booking.id,
      customerId: user.id,
      providerId: booking.providerId,
      rating: data.rating,
      comment: data.comment,
    });

    return toReview(review);
  } catch (error) {
    if (error.code === "P2002") {
      throw new ConflictError("Booking has already been reviewed");
    }
    if (error.code === "P2025") {
      throw new ValidationError("Provider profile not found");
    }
    throw error;
  }
}

export async function listProviderReviews(providerId, query) {
  const provider = await findPublicProviderById(providerId);

  if (!provider) {
    throw new NotFoundError("Provider not found");
  }

  const [reviews, total] = await findProviderReviews(providerId, {
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });

  return {
    data: reviews.map(toReview),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export async function deleteReview(id) {
  const review = await deleteReviewWithAggregate(id);

  if (!review) {
    throw new NotFoundError("Review not found");
  }

  return {
    id: review.id,
    bookingId: review.bookingId,
    customerId: review.customerId,
    providerId: review.providerId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
  };
}
