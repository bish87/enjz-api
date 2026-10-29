import { Router } from "express";
import {
  getCategories,
  newCategory,
  removeCategory,
} from "../controllers/category.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { categorySchema, idParamSchema } from "../validation/common.schema.js";

const router = Router();

router.get("/", getCategories);
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(categorySchema),
  newCategory
);
router.post(
  "/new",
  authenticate,
  authorize("ADMIN"),
  validate(categorySchema),
  newCategory
);
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  removeCategory
);

export default router;
