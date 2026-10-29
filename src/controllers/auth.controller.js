import passport from "../config/passport.js";
import { generateToken } from "../utils/jwt.js";
import { registerUser } from "../services/auth.services.js";
import { findUserById } from "../repositories/user.repository.js";

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    avatar: user.avatar,
    city: user.city,
    role: user.role,
    status: user.status,
  };
}

export function login(req, res, next) {
  passport.authenticate("local", { session: false }, (error, user, info) => {
    if (error) {
      return next(error);
    }

    if (!user) {
      return res.status(401).json({
        message: info?.message || "Invalid phone or password",
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

    const token = generateToken(user);

    return res.json({
      user: publicUser(user),
      token,
    });
  })(req, res, next);
}

export async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);
    const token = user.status === "ACTIVE" ? generateToken(user) : null;

    return res.status(201).json({
      user: publicUser(user),
      token,
      ...(user.status === "PENDING" && {
        message: "Provider account created and pending admin approval",
      }),
    });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}
