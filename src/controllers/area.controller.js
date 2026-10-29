import { addArea, listAreas, removeArea } from "../services/area.services.js";

export async function getAreas(req, res, next) {
  try {
    const areas = await listAreas(req.validatedQuery.state);
    return res.json({ areas });
  } catch (error) {
    return next(error);
  }
}

export async function newArea(req, res, next) {
  try {
    const area = await addArea(req.body);
    return res.status(201).json({ area });
  } catch (error) {
    return next(error);
  }
}

export async function deleteAreaHandler(req, res, next) {
  try {
    const area = await removeArea(req.params.id);
    return res.json({ area });
  } catch (error) {
    return next(error);
  }
}
