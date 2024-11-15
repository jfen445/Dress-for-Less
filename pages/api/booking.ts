import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../lib/db/db";
import { BookingSchema } from "../../lib/db/schema";
import { IBooking } from "../../common/interfaces/user";
import {
  checkDuplicateBooking,
  getAllBookings,
  getBookingsByDress,
  getBookingsById,
} from "../../lib/db/booking-dao";
import { Booking } from "../../common/types";
import { getDress } from "../../sanity/sanity.query";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method == "GET") {
    const dressId = req.query.dressId as string;

    if (!dressId) {
      const allBookings = await getAllBookings();

      const allBookingInfo = await Promise.all(
        allBookings.map(async (booking) => {
          const dressInfo = await getDress(booking.dressId);
          return { ...booking, dress: dressInfo };
        })
      );
      res.status(200).json(allBookingInfo);

      return;
    }

    const bookings = await getBookingsByDress(dressId);

    if (bookings.length === 0) {
      res.status(404).json({
        message: "There are no bookings made under this dress",
      });
    }

    const bookingItems = bookings as Booking[];

    res.status(200).json(bookingItems);
  } else if (req.method == "POST") {
    const dressId = req.body.dressId as string;
    const size = req.body.size as string;
    const dateBooked = req.body.dateBooked as string;

    const checkBooking = await checkDuplicateBooking(dressId, size, dateBooked);

    if (checkBooking.length > 0) {
      res.status(404).json({
        message: "This dressed has already been booked the the selected day. ",
      });
    }

    let booking: IBooking = {
      dressId: req.body.dressId,
      userId: req.body.userId,
      dateBooked: req.body.dateBooked,
      blockOutPeriod: req.body.blockOutPeriod,
      address: req.body.address,
      price: req.body.price,
      city: req.body.city,
      country: req.body.country,
      postCode: req.body.postCode,
      deliveryType: req.body.deliveryType,
      tracking: req.body.tracking,
      isShipped: req.body.isShipped,
      isReturned: req.body.isReturned,
      paymentIntent: req.body.paymentIntent,
      paymentSuccess: false,
      size: req.body.size,
    };

    const filter = {
      userId: req.body.userId,
      dressId: req.body.dressId,
      size: req.body.size,
      dateBooked: req.body.dateBooked,
    };
    const options = { upsert: true };

    await BookingSchema.updateOne(filter, booking, options);

    res.status(200).json({ message: "Booking successful", booking: booking });
  } else if (req.method == "PATCH") {
    const bookingId = req.query.bookingId as string;

    const booking = await getBookingsById(bookingId);

    if (!booking)
      return res
        .status(404)
        .send("The booking with the given ID was not found.");

    for (let key in req.body.bookingObj) {
      booking[key] = req.body.bookingObj[key];
    }

    const filter = {
      _id: bookingId,
    };

    await BookingSchema.updateOne(filter, booking);

    res
      .status(200)
      .json({ message: "Booking updated successfully", booking: booking });
  }
}
