import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.routes.js";
import categoryRouter from "./src/routes/category.routes.js";
import userRouter from "./src/routes/user.routes.js";
import providerRouter from "./src/routes/provider.routes.js";
import areaRouter from "./src/routes/area.routes.js";
import adminRouter from "./src/routes/admin.routes.js";
import bookingRouter from "./src/routes/booking.routes.js";
import "./src/config/passport.js";
import { errorHandler } from "./src/middleware/auth.middleware.js";
import { env } from "./src/config/env.js";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

app.use(express.json({ limit: "1mb" }));

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

if (env.NODE_ENV !== "test") {
  app.listen(env.PORT, () => {
    console.log(`app listening on port ${env.PORT}`);
  });
}

export default app;
