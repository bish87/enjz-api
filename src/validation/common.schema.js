import { z } from "zod";

export const categorySchema = z
  .object({
    name: z.string().trim().min(1, "Category name is required").max(100),
  })
  .strict();

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid id"),
});
