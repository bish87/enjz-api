import bcrypt from "bcrypt";
import { createUser, findUserByPhone } from "../repositories/user.repository.js";


export async function registerUser(data) {

  const existingUser = await findUserByPhone(data.phone);

  if (existingUser) {
    throw new Error("Phone already registered");
  }


  const passwordHash = await bcrypt.hash(
    data.password,
    10
  );


  const user = await createUser({
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email,
    city: data.city,
    passwordHash
  });


  return user;
}