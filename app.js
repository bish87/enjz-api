import express from "express";
import authRoutes from "./src/routes/auth.routes.js";
import "./src/config/passport.js";
import { errorHandler } from "./src/middleware/auth.middleware.js";
import dotenv from "dotenv";

const app = express();

app.use(express.json());
app.get("/", (req, res) => {
  res.send("API is running");
});
app.use("/api/v1/auth", authRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen( PORT, () => {
    console.log(`app listening on port ${PORT}`)
})

export default app;