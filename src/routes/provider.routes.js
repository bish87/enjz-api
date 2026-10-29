import { Router } from "express";
import {
  getMyProvider,
  getProvider,
  listProviders,
  updateMyProvider,
  updateMyProviderAreas,
  updateMyProviderCategories,
} from "../controllers/provider.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamSchema } from "../validation/common.schema.js";
import {
  providerAreasSchema,
  providerCategoriesSchema,
  providerListQuerySchema,
  updateProviderSchema,
} from "../validation/provider.schema.js";

const router = Router();

router.get("/", validate(providerListQuerySchema, "query"), listProviders);

router.get("/me", authenticate, authorize("PROVIDER"), getMyProvider);
router.put(
  "/me",
  authenticate,
  authorize("PROVIDER"),
  validate(updateProviderSchema),
  updateMyProvider
);
router.put(
  "/me/categories",
  authenticate,
  authorize("PROVIDER"),
  validate(providerCategoriesSchema),
  updateMyProviderCategories
);
router.put(
  "/me/areas",
  authenticate,
  authorize("PROVIDER"),
  validate(providerAreasSchema),
  updateMyProviderAreas
);

router.get("/:id", validate(idParamSchema, "params"), getProvider);

export default router;
