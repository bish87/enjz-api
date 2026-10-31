import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  me,
  register,
  resetPassword,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rate-limit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validation/auth.schema.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);

router.post("/login", authLimiter, validate(loginSchema), login);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  resetPassword
);

router.get("/me", authenticate, me);

router.post("/logout", authenticate, logout);

router.post(
  "/password",
  authenticate,
  validate(changePasswordSchema),
  changePassword
);

export default router;
