import { Router } from "express";
import {
  deleteAreaHandler,
  getAreas,
  newArea,
} from "../controllers/area.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamSchema } from "../validation/common.schema.js";
import { areaListQuerySchema, areaSchema } from "../validation/area.schema.js";

const router = Router();

router.get("/", validate(areaListQuerySchema, "query"), getAreas);
router.post("/", authenticate, authorize("ADMIN"), validate(areaSchema), newArea);
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  deleteAreaHandler
);

export default router;
