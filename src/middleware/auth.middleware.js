import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { findUserById } from "../repositories/user.repository.js";

export async function authenticate(req, res, next) {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const match = authHeader.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({
      message: "Invalid token format",
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(match[1], env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }

  try {
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        message:
          user.status === "PENDING"
            ? "Account pending approval"
            : "Account suspended",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    return next(error);
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission",
      });
    }

    return next();
  };
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  const status =
    err.status ||
    (err.code === "P2002" ? 409 : err.code === "P2025" ? 404 : 500);

  const message =
    status >= 500 && env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  return res.status(status).json({ message });
}
