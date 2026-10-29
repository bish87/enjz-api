import bcrypt from "bcrypt";
import { createUser, findUserByEmail, findUserByPhone } from "../repositories/user.repository.js";
import { ConflictError } from "../utils/errors.js";

export async function registerUser(data) {
  const existingUser = await findUserByPhone(data.phone);

  if (existingUser) {
    throw new ConflictError("Phone already registered");
  }

  if (data.email) {
    const existingEmail = await findUserByEmail(data.email);

    if (existingEmail) {
      throw new ConflictError("Email already registered");
    }
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await createUser(
    {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      city: data.city,
      passwordHash,
      role: data.role,
      status: "ACTIVE",
    },
    { createProviderProfile: data.role === "PROVIDER" }
  );

  return user;
}
