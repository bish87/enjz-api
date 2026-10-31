import { adminResetPassword } from "../services/auth.services.js";

export async function resetUserPassword(req, res, next) {
  try {
    const user = await adminResetPassword(req.params.id, req.body.newPassword);
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}
