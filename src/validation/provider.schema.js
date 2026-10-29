import { z } from "zod";

export const updateProviderSchema = z
  .object({
    bio: z.string().trim().max(1000).nullable().optional(),
    experienceYears: z
      .coerce.number()
      .int("Experience years must be a whole number")
      .min(0)
      .max(60)
      .nullable()
      .optional(),
    startingPrice: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
    isAvailable: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const providerCategoriesSchema = z
  .object({
    categories: z
      .array(
        z
          .object({
            categoryId: z.coerce.number().int().positive(),
            price: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
          })
          .strict()
      )
      .max(10, "A provider can select at most 10 categories"),
  })
  .strict();

export const providerAreasSchema = z
  .object({
    areaIds: z
      .array(z.coerce.number().int().positive())
      .max(20, "A provider can serve at most 20 areas"),
  })
  .strict();

export const providerListQuerySchema = z
  .object({
    categoryId: z.coerce.number().int().positive().optional(),
    areaId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().min(1).max(100).optional(),
    available: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

export const verificationSchema = z
  .object({
    status: z.enum(["VERIFIED", "REJECTED", "PENDING"]),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const adminProviderListQuerySchema = z
  .object({
    status: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).optional(),
  })
  .strict();
