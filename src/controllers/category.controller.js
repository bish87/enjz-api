import {
  addCategory,
  listCategories,
  removeCategory as removeCategoryService,
} from "../services/category.services.js";

export async function getCategories(req, res, next) {
  try {
    const categories = await listCategories();
    return res.json({ categories });
  } catch (err) {
    return next(err);
  }
}

export async function newCategory(req, res, next) {
  try {
    const category = await addCategory(req.body);

    return res.status(201).json({ category });
  } catch (err) {
    return next(err);
  }
}

export async function removeCategory(req, res, next) {
  try {
    const category = await removeCategoryService(req.params.id);

    return res.json({ category });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Category not found" });
    }

    return next(err);
  }
}
