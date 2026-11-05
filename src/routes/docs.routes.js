import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env.js";
import { openapiSpec } from "../docs/openapi.js";

const router = Router();

if (env.DOCS_ENABLED) {
  router.get("/openapi.json", (req, res) => res.json(openapiSpec));

  router.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customSiteTitle: "enjz API Documentation",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: "none",
        filter: true,
        tagsSorter: "alpha",
        operationsSorter: "method",
      },
    })
  );
}

export default router;
