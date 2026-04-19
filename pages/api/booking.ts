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
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  if (req.method == "GET") {
    const dressId = req.query.dressId as string;

    if (!dressId) {
      const allBookings = await getAllBookings();

      const allBookingInfo = await Promise.all(
        allBookings.map(async (booking) => {
          const dressInfo = await getDress(booking.dressId);
          return { ...booking, dress: dressInfo };
        }),
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
    const dresses = req.body.booking as Booking[];
    const paymentIntent = req.body.paymentIntent;

    var errorResponse: String[] = [];

    const payment = await stripe.paymentIntents.retrieve(paymentIntent);

    if (payment.status !== "succeeded") {
      return res.status(400).json({
        message: "Payment not confirmed. Please try again.",
      });
    }

    for (const dress of dresses) {
      const checkBooking = await checkDuplicateBooking(
        dress.dressId,
        dress.size,
        dress.dateBooked,
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
    for (const dress of dresses) {
      let booking: IBooking = {
        dressId: dress.dressId,
        userId: dress.userId,
        dateBooked: dress.dateBooked,
        blockOutPeriod: dress.blockOutPeriod,
        address: {
          address: dress.address?.address ?? "",
          suburb: dress.address?.suburb ?? "",
          city: dress.address?.city ?? "",
          country: dress.address?.country ?? "",
          postCode: dress.address?.postCode ?? "",
        },
        billingAddress: {
          address: dress.billingAddress.address,
          suburb: dress.billingAddress.suburb,
          city: dress.billingAddress.city,
          country: dress.billingAddress.country,
          postCode: dress.billingAddress.postCode,
        },
        price: dress.price,
        deliveryType: dress.deliveryType,
        tracking: dress.tracking,
        isShipped: dress.isShipped,
        isReturned: dress.isReturned,
        paymentIntent: paymentIntent,
        paymentSuccess: false,
        size: dress.size,
        status: dress.status,
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
    }

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
