import {
  createBooking as createBookingRecord,
  findAdminBookings,
  findBookingById,
  findCustomerBookings,
  findProviderBookings,
  transitionBookingStatus,
} from "../repositories/booking.repository.js";
import { findProviderProfileByUserId } from "../repositories/provider.repository.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";

const CONTACT_STATUSES = ["ACCEPTED", "COMPLETED"];

function withContact(person, reveal) {
  const base = {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    avatar: person.avatar,
    city: person.city,
  };

  if (!reveal) {
    return base;
  }

  return {
    ...base,
    phone: person.phone,
    email: person.email,
  };
}

export function toBooking(booking, { revealContact = false } = {}) {
  return {
    id: booking.id,
    status: booking.status,
    address: booking.address,
    description: booking.description,
    scheduledAt: booking.scheduledAt,
    agreedPrice: booking.agreedPrice,
    cancelledReason: booking.cancelledReason,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    customer: withContact(booking.customer, revealContact),
    provider: withContact(booking.provider, revealContact),
    category: booking.category,
    area: booking.area,
    review: booking.review,
  };
}

function pagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

async function getOwnedBooking(id, user) {
  const booking = await findBookingById(id);

  if (
    !booking ||
    (booking.customerId !== user.id &&
      booking.providerId !== user.id &&
      user.role !== "ADMIN")
  ) {
    throw new NotFoundError("Booking not found");
  }

  return booking;
}

export async function createBooking(user, data) {
  if (data.providerId === user.id) {
    throw new ValidationError("You cannot book yourself");
  }

  const profile = await findProviderProfileByUserId(data.providerId);

  if (
    !profile ||
    profile.user.status !== "ACTIVE" ||
    profile.verificationStatus !== "VERIFIED"
  ) {
    throw new NotFoundError("Provider not found");
  }

  if (!profile.isAvailable) {
    throw new ConflictError("Provider is currently unavailable");
  }

  if (
    !profile.categories.some((item) => item.category.id === data.categoryId)
  ) {
    throw new ValidationError("Provider does not offer this category");
  }

  if (!profile.areas.some((item) => item.area.id === data.areaId)) {
    throw new ValidationError("Provider does not serve this area");
  }

  const booking = await createBookingRecord({
    customerId: user.id,
    providerId: data.providerId,
    categoryId: data.categoryId,
    areaId: data.areaId,
    address: data.address,
    description: data.description,
    scheduledAt: data.scheduledAt,
  });

  return toBooking(booking);
}

export async function listMyBookings(user, query) {
  const filters = {
    status: query.status,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  };

  let result;

  if (user.role === "CUSTOMER") {
    result = await findCustomerBookings(user.id, filters);
  } else if (user.role === "PROVIDER") {
    result = await findProviderBookings(user.id, filters);
  } else {
    throw new ForbiddenError("Only customers and providers have bookings");
  }

  const revealContact = (booking) => CONTACT_STATUSES.includes(booking.status);

  return {
    data: result.bookings.map((booking) =>
      toBooking(booking, { revealContact: revealContact(booking) })
    ),
    pagination: pagination(query.page, query.limit, result.total),
  };
}

export async function getBooking(user, id) {
  const booking = await getOwnedBooking(id, user);
  const revealContact =
    user.role === "ADMIN" || CONTACT_STATUSES.includes(booking.status);

  return toBooking(booking, { revealContact });
}

async function transition(booking, user, fromStatuses, data) {
  const count = await transitionBookingStatus(booking.id, fromStatuses, data, {
    providerId: user.id,
  });

  if (count === 0) {
    throw new ConflictError(
      "Booking is not in a state that allows this action"
    );
  }

  const updated = await findBookingById(booking.id);
  return toBooking(updated, {
    revealContact: CONTACT_STATUSES.includes(updated.status),
  });
}

export async function acceptBooking(user, id, data) {
  const booking = await getOwnedBooking(id, user);

  if (booking.providerId !== user.id) {
    throw new ForbiddenError(
      "Only the assigned provider can accept this booking"
    );
  }

  return transition(booking, user, ["PENDING"], {
    status: "ACCEPTED",
    ...(data.agreedPrice !== undefined && { agreedPrice: data.agreedPrice }),
  });
}

export async function declineBooking(user, id, data) {
  const booking = await getOwnedBooking(id, user);

  if (booking.providerId !== user.id) {
    throw new ForbiddenError(
      "Only the assigned provider can decline this booking"
    );
  }

  return transition(booking, user, ["PENDING"], {
    status: "DECLINED",
    cancelledReason: data.reason ?? null,
  });
}

export async function completeBooking(user, id) {
  const booking = await getOwnedBooking(id, user);

  if (booking.providerId !== user.id) {
    throw new ForbiddenError(
      "Only the assigned provider can complete this booking"
    );
  }

  return transition(booking, user, ["ACCEPTED"], {
    status: "COMPLETED",
  });
}

export async function cancelBooking(user, id, data) {
  const booking = await getOwnedBooking(id, user);

  if (user.role !== "ADMIN" && booking.customerId !== user.id) {
    if (booking.providerId !== user.id) {
      throw new ForbiddenError("You cannot cancel this booking");
    }
  }

  const where =
    user.role === "ADMIN"
      ? {}
      : booking.customerId === user.id
        ? { customerId: user.id }
        : { providerId: user.id };

  const count = await transitionBookingStatus(
    booking.id,
    ["PENDING", "ACCEPTED"],
    {
      status: "CANCELLED",
      cancelledReason: data.reason ?? null,
    },
    where
  );

  if (count === 0) {
    throw new ConflictError("Booking can no longer be cancelled");
  }

  const updated = await findBookingById(booking.id);
  return toBooking(updated);
}

export async function listBookingsForAdmin(query) {
  const result = await findAdminBookings({
    status: query.status,
    customerId: query.customerId,
    providerId: query.providerId,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });

  return {
    data: result.bookings.map((booking) =>
      toBooking(booking, { revealContact: true })
    ),
    pagination: pagination(query.page, query.limit, result.total),
  };
}
