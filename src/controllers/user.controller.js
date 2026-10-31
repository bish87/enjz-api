import {
  findUserById,
  updateUserProfile,
} from "../repositories/user.repository.js";

export async function getProfile(req, res, next) {
  try {
    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}

export async function patchProfile(req, res, next) {
  try {
    const user = await updateUserProfile(req.user.id, req.body);
    return res.json({ user });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    return next(error);
  }
}
