import "./env.js";
import request from "supertest";

let appPromise;

export function getApp() {
  appPromise ??= import("../../app.js").then((module) => module.default);
  return appPromise;
}

export async function http() {
  return request(await getApp());
}

export async function login(phone, password = "Passw0rd!") {
  const response = await (
    await http()
  )
    .post("/api/v1/auth/login")
    .send({ phone, password });

  return response;
}

export async function loginToken(phone, password = "Passw0rd!") {
  const response = await login(phone, password);
  return response.body.token;
}

export function bearer(token) {
  return `Bearer ${token}`;
}
