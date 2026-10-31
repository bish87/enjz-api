import passport from "../config/passport.js";
import { findUserById } from "../repositories/user.repository.js";
import {
  changePassword as changePasswordService,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resetPassword as resetPasswordService,
} from "../services/auth.services.js";
import {
  clearFailedLogins,
  isLoginLocked,
  MAX_LOGIN_ATTEMPTS,
  recordFailedLogin,
} from "../services/login-attempt.services.js";
import { TooManyRequestsError } from "../utils/errors.js";
import { generateToken } from "../utils/jwt.js";

const LOCKOUT_MESSAGE =
  "Too many failed login attempts. Please try again later.";

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

export async function login(req, res, next) {
  const phone = req.body.phone;
  const ip = req.ip ?? "unknown";

  try {
    if (await isLoginLocked(phone, ip)) {
      throw new TooManyRequestsError(LOCKOUT_MESSAGE);
    }
  } catch (error) {
    return next(error);
  }

  return passport.authenticate(
    "local",
    { session: false },
    async (error, user, info) => {
      try {
        if (error) {
          return next(error);
        }

        if (!user) {
          const attempts = await recordFailedLogin(phone, ip);

          if (attempts >= MAX_LOGIN_ATTEMPTS) {
            throw new TooManyRequestsError(LOCKOUT_MESSAGE);
          }

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

        await clearFailedLogins(phone, ip);

        const token = generateToken(user);

        return res.json({
          user: publicUser(user),
          token,
        });
      } catch (error) {
        return next(error);
      }
    }
  )(req, res, next);
}

export async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);
    const token = generateToken(user);

    return res.status(201).json({
      user: publicUser(user),
      token,
      ...(user.role === "PROVIDER" && {
        message:
          "Provider account created. Complete your profile and wait for admin verification.",
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

export async function logout(req, res, next) {
  try {
    await logoutUser(req.user.id);
    return res.json({ message: "Logged out" });
  } catch (error) {
    return next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await changePasswordService(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    await requestPasswordReset(req.body.phone);

    return res.json({
      message: "If an account matches, a reset link has been sent.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const result = await resetPasswordService(
      req.body.token,
      req.body.newPassword
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
