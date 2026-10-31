import { Router } from "express";
import {
  acceptBookingHandler,
  cancelBookingHandler,
  completeBookingHandler,
  declineBookingHandler,
  getBookingHandler,
  listMyBookingsHandler,
  newBooking,
} from "../controllers/booking.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamSchema } from "../validation/common.schema.js";
import {
  acceptBookingSchema,
  bookingListQuerySchema,
  bookingReasonSchema,
  createBookingSchema,
} from "../validation/booking.schema.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  authorize("CUSTOMER"),
  validate(createBookingSchema),
  newBooking
);

router.get(
  "/me",
  validate(bookingListQuerySchema, "query"),
  listMyBookingsHandler
);

router.patch(
  "/:id/accept",
  authorize("PROVIDER"),
  validate(idParamSchema, "params"),
  validate(acceptBookingSchema),
  acceptBookingHandler
);
router.patch(
  "/:id/decline",
  authorize("PROVIDER"),
  validate(idParamSchema, "params"),
  validate(bookingReasonSchema),
  declineBookingHandler
);
router.patch(
  "/:id/complete",
  authorize("PROVIDER"),
  validate(idParamSchema, "params"),
  completeBookingHandler
);
router.patch(
  "/:id/cancel",
  validate(idParamSchema, "params"),
  validate(bookingReasonSchema),
  cancelBookingHandler
);

router.get("/:id", validate(idParamSchema, "params"), getBookingHandler);

export default router;
