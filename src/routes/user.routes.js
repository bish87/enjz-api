import { Router } from "express";
import { getProfile, patchProfile } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/profile", authenticate, getProfile);
router.patch("/profile", authenticate, patchProfile);

export default router;
