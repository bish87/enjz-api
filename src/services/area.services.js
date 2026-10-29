import {
  createArea,
  deleteArea,
  findAreas,
} from "../repositories/area.repository.js";
import { NotFoundError } from "../utils/errors.js";

export function listAreas(state) {
  return findAreas(state);
}

export function addArea(data) {
  return createArea({
    name: data.name,
    state: data.state,
  });
}

export async function removeArea(id) {
  try {
    return await deleteArea(id);
  } catch (error) {
    if (error.code === "P2025") {
      throw new NotFoundError("Area not found");
    }
    throw error;
  }
}
