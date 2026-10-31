import "dotenv/config";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./src/config/env.js";
import { logger } from "./src/config/logger.js";
import { prisma } from "./src/config/prisma.js";
import { errorHandler } from "./src/middleware/auth.middleware.js";
import { globalLimiter } from "./src/middleware/rate-limit.middleware.js";
import adminRouter from "./src/routes/admin.routes.js";
import areaRouter from "./src/routes/area.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import bookingRouter from "./src/routes/booking.routes.js";
import categoryRouter from "./src/routes/category.routes.js";
import healthRouter from "./src/routes/health.routes.js";
import providerRouter from "./src/routes/provider.routes.js";
import userRouter from "./src/routes/user.routes.js";
import "./src/config/passport.js";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);
app.use(compression());
app.use(
  pinoHttp({
    logger,
    autoLogging: env.NODE_ENV !== "test",
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(globalLimiter);

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/providers", providerRouter);
app.use("/api/v1/areas", areaRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/bookings", bookingRouter);

app.use((req, res) => {
  return res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

export default app;

let server;

if (env.NODE_ENV !== "test") {
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "API listening");
  });
}

async function shutdown(signal) {
  logger.info({ signal }, "shutting down");

  const timeout = setTimeout(() => {
    logger.error("graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  timeout.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await prisma.$disconnect();
    clearTimeout(timeout);
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "shutdown failed");
    process.exit(1);
  }
}

if (env.NODE_ENV !== "test") {
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => {
      void shutdown(signal);
    });
  }
}
