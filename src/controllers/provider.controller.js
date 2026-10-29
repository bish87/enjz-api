import {
  getMyProviderProfile,
  getPublicProvider,
  listPublicProviders,
  updateMyAreas,
  updateMyCategories,
  updateMyProviderProfile,
} from "../services/provider.services.js";

export async function getMyProvider(req, res, next) {
  try {
    const provider = await getMyProviderProfile(req.user.id);
    return res.json({ provider });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyProvider(req, res, next) {
  try {
    const provider = await updateMyProviderProfile(req.user.id, req.body);
    return res.json({ provider });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyProviderCategories(req, res, next) {
  try {
    const provider = await updateMyCategories(req.user.id, req.body.categories);
    return res.json({ provider });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyProviderAreas(req, res, next) {
  try {
    const provider = await updateMyAreas(req.user.id, req.body.areaIds);
    return res.json({ provider });
  } catch (error) {
    return next(error);
  }
}

export async function listProviders(req, res, next) {
  try {
    const result = await listPublicProviders(req.validatedQuery);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getProvider(req, res, next) {
  try {
    const provider = await getPublicProvider(req.params.id);
    return res.json({ provider });
  } catch (error) {
    return next(error);
  }
}
