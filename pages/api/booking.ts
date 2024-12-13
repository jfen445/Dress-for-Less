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
import { Body } from "@react-email/components";

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
    const dresses = req.body as Booking[];
    var errorResponse: String[] = [];

    for (const dress of dresses) {
      const checkBooking = await checkDuplicateBooking(
        dress.dressId,
        dress.size,
        dress.dateBooked
      );

      if (checkBooking.length > 0) {
        errorResponse.push(dress.dressId);
      }
    }

    if (errorResponse.length > 0) {
      res.status(404).json({
        message: "This dressed has already been booked the the selected day. ",
        body: errorResponse,
      });
    }

    var bookedDresses: IBooking[] = [];
    dresses.forEach(async (dress) => {
      let booking: IBooking = {
        dressId: dress.dressId,
        userId: dress.userId,
        dateBooked: dress.dateBooked,
        blockOutPeriod: dress.blockOutPeriod,
        address: dress.address,
        price: dress.price,
        city: dress.city,
        country: dress.country,
        postCode: dress.postCode,
        deliveryType: dress.deliveryType,
        tracking: dress.tracking,
        isShipped: dress.isShipped,
        isReturned: dress.isReturned,
        paymentIntent: dress.paymentIntent,
        paymentSuccess: false,
        size: dress.size,
      };

      bookedDresses = bookedDresses.concat(booking);

      const filter = {
        userId: dress.userId,
        dressId: dress.dressId,
        size: dress.size,
        dateBooked: dress.dateBooked,
      };
      const options = { upsert: true };

      await BookingSchema.updateOne(filter, booking, options);
    });

    res
      .status(200)
      .json({ message: "Booking successful", booking: bookedDresses });
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
