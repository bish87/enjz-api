import { prisma } from "../config/prisma.js";

const bookingInclude = {
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      city: true,
      phone: true,
      email: true,
    },
  },
  provider: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      city: true,
      phone: true,
      email: true,
    },
  },
  category: { select: { id: true, name: true } },
  area: { select: { id: true, name: true, state: true } },
  review: {
    select: { id: true, rating: true, comment: true, createdAt: true },
  },
};

export function createBooking(data) {
  return prisma.booking.create({
    data,
    include: bookingInclude,
  });
}

export function findBookingById(id) {
  return prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
}

function buildWhere({ userId, status, customerId, providerId }) {
  return {
    ...(userId ? { customerId: userId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(providerId ? { providerId } : {}),
    ...(status ? { status } : {}),
  };
}

async function findBookings(where, { skip, take }) {
  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: [{ scheduledAt: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total };
}

export function findCustomerBookings(userId, filters) {
  return findBookings(buildWhere({ userId, status: filters.status }), filters);
}

export function findProviderBookings(userId, filters) {
  return findBookings(
    buildWhere({ providerId: userId, status: filters.status }),
    filters
  );
}

export function findAdminBookings(filters) {
  return findBookings(
    buildWhere({
      customerId: filters.customerId,
      providerId: filters.providerId,
      status: filters.status,
    }),
    filters
  );
}

export async function transitionBookingStatus(
  id,
  fromStatuses,
  data,
  constraints = {}
) {
  const result = await prisma.booking.updateMany({
    where: {
      id,
      status: { in: fromStatuses },
      ...constraints,
    },
    data,
  });

  return result.count;
}
