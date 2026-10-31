import { Router } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ok", db: "up" });
  } catch (error) {
    req.log?.error({ err: error }, "health check failed");
    return res.status(503).json({ status: "error", db: "down" });
  }
});

export default router;
