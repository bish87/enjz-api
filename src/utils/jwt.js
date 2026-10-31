import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      v: user.tokenVersion ?? 0,
    },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "7d",
    }
  );
}
