import {
  acceptBooking,
  cancelBooking,
  completeBooking,
  createBooking,
  declineBooking,
  getBooking,
  listBookingsForAdmin,
  listMyBookings,
} from "../services/booking.services.js";

export async function newBooking(req, res, next) {
  try {
    const booking = await createBooking(req.user, req.body);
    return res.status(201).json({ booking });
  } catch (error) {
    return next(error);
  }
}

export async function listMyBookingsHandler(req, res, next) {
  try {
    const result = await listMyBookings(req.user, req.validatedQuery);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getBookingHandler(req, res, next) {
  try {
    const booking = await getBooking(req.user, req.params.id);
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
}

export async function acceptBookingHandler(req, res, next) {
  try {
    const booking = await acceptBooking(req.user, req.params.id, req.body);
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
}

export async function declineBookingHandler(req, res, next) {
  try {
    const booking = await declineBooking(req.user, req.params.id, req.body);
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
}

export async function completeBookingHandler(req, res, next) {
  try {
    const booking = await completeBooking(req.user, req.params.id);
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
}

export async function cancelBookingHandler(req, res, next) {
  try {
    const booking = await cancelBooking(req.user, req.params.id, req.body);
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
}

export async function listAdminBookings(req, res, next) {
  try {
    const result = await listBookingsForAdmin(req.validatedQuery);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
