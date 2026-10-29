import {
  listProvidersForAdmin,
  verifyProvider,
} from "../services/provider.services.js";

export async function listAdminProviders(req, res, next) {
  try {
    const providers = await listProvidersForAdmin(req.validatedQuery.status);
    return res.json({ providers });
  } catch (error) {
    return next(error);
  }
}

export async function verifyAdminProvider(req, res, next) {
  try {
    const provider = await verifyProvider(req.params.id, req.body);
    return res.json({ provider });
  } catch (error) {
    return next(error);
  }
}
