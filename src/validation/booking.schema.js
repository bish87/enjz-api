import { z } from "zod";

const bookingStatuses = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "COMPLETED",
  "CANCELLED",
];

const isoDate = z.coerce
  .date({ message: "scheduledAt must be a valid date" })
  .refine((date) => date.getTime() > Date.now(), {
    message: "scheduledAt must be in the future",
  });

export const createBookingSchema = z
  .object({
    providerId: z.coerce.number().int().positive(),
    categoryId: z.coerce.number().int().positive(),
    areaId: z.coerce.number().int().positive(),
    address: z.string().trim().min(5, "Address is too short").max(255),
    description: z.string().trim().min(5, "Description is too short").max(1000),
    scheduledAt: isoDate,
  })
  .strict();

export const bookingListQuerySchema = z
  .object({
    status: z.enum(bookingStatuses).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

export const adminBookingListQuerySchema = z
  .object({
    status: z.enum(bookingStatuses).optional(),
    customerId: z.coerce.number().int().positive().optional(),
    providerId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

export const acceptBookingSchema = z
  .object({
    agreedPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
  })
  .strict()
  .default({});

export const bookingReasonSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict()
  .default({});
