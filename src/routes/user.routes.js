import { Router } from "express";
import { getProfile, patchProfile } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateProfileSchema } from "../validation/auth.schema.js";

const router = Router();

router.get("/profile", authenticate, getProfile);
router.patch(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  patchProfile
);

export default router;
