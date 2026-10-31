import {
  createCategory,
  deleteCategory,
  findCategories,
  getCategoryByName,
} from "../repositories/category.repository.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";

export function listCategories() {
  return findCategories();
}

export async function addCategory(data) {
  const name = data.name.trim();

  if (!name) {
    throw new ValidationError("category name is required");
  }

  const existingCategory = await getCategoryByName(name);

  if (existingCategory) {
    throw new ConflictError("category already exists");
  }

  return createCategory({ name });
}

export async function removeCategory(id) {
  try {
    return await deleteCategory(id);
  } catch (error) {
    if (error.code === "P2025") {
      throw new NotFoundError("Category not found");
    }
    throw error;
  }
}
