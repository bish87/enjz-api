import { z } from "zod";

const sudanPhone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine(
    (value) => /^(?:\+?249|0)?9\d{8}$/.test(value),
    "Invalid phone number"
  )
  .transform((value) => {
    const digits = value.replace(/^\+/, "");
    const local = digits.startsWith("249")
      ? digits.slice(3)
      : digits.replace(/^0/, "");

    return `+249${local}`;
  });

const optionalEmail = z
  .union([
    z.string().trim().toLowerCase().email("Invalid email"),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => value || null);

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(50),
    lastName: z
      .string()
      .trim()
      .max(50)
      .optional()
      .nullable()
      .transform((value) => value || null),
    phone: sudanPhone,
    email: optionalEmail,
    city: z.string().trim().min(1, "City is required").max(100),
    password: passwordSchema,
    role: z.enum(["CUSTOMER", "PROVIDER"]).default("CUSTOMER"),
  })
  .strict();

export const loginSchema = z
  .object({
    phone: sudanPhone,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export const forgotPasswordSchema = z
  .object({
    phone: sudanPhone,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1, "Reset token is required")
      .max(200, "Reset token is invalid"),
    newPassword: passwordSchema,
  })
  .strict();

export const adminResetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
  })
  .strict();

export const updateProfileSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name cannot be empty")
      .max(50)
      .optional(),
    lastName: z
      .string()
      .trim()
      .max(50)
      .nullable()
      .optional()
      .transform((value) => (value === "" ? null : value)),
    city: z.string().trim().min(1, "City cannot be empty").max(100).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one profile field to update",
  });
