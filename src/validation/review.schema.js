import { z } from "zod";

export const createReviewSchema = z
  .object({
    rating: z.coerce
      .number()
      .int("Rating must be a whole number")
      .min(1, "Rating must be between 1 and 5")
      .max(5, "Rating must be between 1 and 5"),
    comment: z
      .string()
      .trim()
      .max(500, "Comment must be at most 500 characters")
      .nullable()
      .optional()
      .transform((value) => value || null),
  })
  .strict();

export const reviewListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();
