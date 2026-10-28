import { findUserById, updateUserProfile } from "../repositories/user.repository.js";

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
    const allowedFields = ["firstName", "lastName", "city"];
    const updates = req.body;

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return res.status(400).json({ message: "Request body must be a JSON object" });
    }

    const unknownFields = Object.keys(updates).filter(
      (field) => !allowedFields.includes(field)
    );
    if (unknownFields.length > 0) {
      return res.status(400).json({
        message: `Fields cannot be updated: ${unknownFields.join(", ")}`
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Provide at least one profile field to update" });
    }

    for (const field of ["firstName", "city"]) {
      if (field in updates && (typeof updates[field] !== "string" || !updates[field].trim())) {
        return res.status(400).json({ message: `${field} must be a non-empty string` });
      }
    }

    if ("lastName" in updates && updates.lastName !== null && typeof updates.lastName !== "string") {
      return res.status(400).json({ message: "lastName must be a string or null" });
    }

    const data = Object.fromEntries(
      Object.entries(updates).map(([field, value]) => [
        field,
        typeof value === "string" ? value.trim() : value
      ])
    );

    const user = await updateUserProfile(req.user.id, data);
    return res.json({ user });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    return next(error);
  }
}
