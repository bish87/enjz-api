import { z } from "zod";

export const areaSchema = z
  .object({
    name: z.string().trim().min(1, "Area name is required").max(100),
    state: z.string().trim().min(1, "State is required").max(100),
  })
  .strict();

export const areaListQuerySchema = z
  .object({
    state: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
