import {
  createReview,
  deleteReview,
  listProviderReviews,
} from "../services/review.services.js";

export async function newReview(req, res, next) {
  try {
    const review = await createReview(req.user, req.params.id, req.body);
    return res.status(201).json({ review });
  } catch (error) {
    return next(error);
  }
}

export async function getProviderReviews(req, res, next) {
  try {
    const result = await listProviderReviews(req.params.id, req.validatedQuery);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function removeReview(req, res, next) {
  try {
    const review = await deleteReview(req.params.id);
    return res.json({ review });
  } catch (error) {
    return next(error);
  }
}
