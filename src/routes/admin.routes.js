import { Router } from "express";
import {
  listAdminProviders,
  verifyAdminProvider,
} from "../controllers/admin.provider.controller.js";
import { listAdminBookings } from "../controllers/booking.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamSchema } from "../validation/common.schema.js";
import {
  adminProviderListQuerySchema,
  verificationSchema,
} from "../validation/provider.schema.js";
import { adminBookingListQuerySchema } from "../validation/booking.schema.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get(
  "/providers",
  validate(adminProviderListQuerySchema, "query"),
  listAdminProviders
);
router.patch(
  "/providers/:id/verification",
  validate(idParamSchema, "params"),
  validate(verificationSchema),
  verifyAdminProvider
);

router.get(
  "/bookings",
  validate(adminBookingListQuerySchema, "query"),
  listAdminBookings
);

export default router;
