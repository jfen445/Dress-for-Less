import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../lib/db/db";
import { BookingSchema } from "../../lib/db/schema";
import { IBooking } from "../../common/interfaces/user";
import {
  checkDuplicateBooking,
  deleteBooking,
  getBookingAvailabilityByDress,
  getBookingsById,
} from "../../lib/db/booking-dao";
import { Booking, BookingAvailability } from "../../common/types";
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import dayjs from "dayjs";
import { createUser, findUser } from "../../lib/db/user-dao";
import { getCouponsByIds, redeemCoupons } from "../../lib/db/coupon-dao";
import { AccountType } from "../../common/enums/AccountType";
import { getDress } from "../../sanity/sanity.query";
import { checkBlockOut } from "../../lib/db/blockout-dao";

const FREE_COUPON_CHECKOUT_PREFIX = "FREE_COUPON_";

// Returns the full Fri/Sat/Sun window for any weekend booking date.
function calculateBlockOutPeriod(dateBooked: string): string[] {
  const date = dayjs(dateBooked);
  const day = date.day(); // 0=Sun, 5=Fri, 6=Sat

  if (day === 5) {
    return [
      date.format("YYYY-MM-DD"),
      date.add(1, "day").format("YYYY-MM-DD"),
      date.add(2, "day").format("YYYY-MM-DD"),
    ];
  } else if (day === 6) {
    return [
      date.subtract(1, "day").format("YYYY-MM-DD"),
      date.format("YYYY-MM-DD"),
      date.add(1, "day").format("YYYY-MM-DD"),
    ];
  } else if (day === 0) {
    return [
      date.subtract(2, "day").format("YYYY-MM-DD"),
      date.subtract(1, "day").format("YYYY-MM-DD"),
      date.format("YYYY-MM-DD"),
    ];
  }

  return [];
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<boolean> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const users = await findUser(session.user.email);
  if (users.length === 0 || users[0].role !== AccountType.Admin) {
    res.status(403).json({ message: "Forbidden: Admins only" });
    return false;
  }
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);

  await dbConnect();

  if (req.method == "GET") {
    const dressId = req.query.dressId as string;

    if (!dressId) {
      return res
        .status(400)
        .json({ message: "dressId query param is required" });
    }

    const bookings = await getBookingAvailabilityByDress(dressId);

    if (bookings.length === 0) {
      res.status(404).json({
        message: "There are no bookings made under this dress",
      });
    }

    const bookingItems = bookings as BookingAvailability[];

    res.status(200).json(bookingItems);
  } else if (req.method == "POST") {
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const dresses = req.body.booking as Booking[];
    const paymentIntent = req.body.paymentIntent as string;
    const couponIds = (req.body.couponIds as string[] | undefined) ?? [];

    var errorResponse: String[] = [];

    let discountAmount = 0;

    if (couponIds.length > 0) {
      if (!session.user?.email) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const users = await findUser(session.user.email);
      const user = users[0];
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const coupons = await getCouponsByIds(couponIds);

      if (coupons.length !== couponIds.length) {
        return res
          .status(400)
          .json({ message: "One or more coupons could not be found" });
      }

      const now = dayjs().toISOString();
      const invalidCoupon = coupons.find(
        (c) =>
          c.userId.toString() !== user._id.toString() ||
          c.isRedeemed ||
          c.expiryDate < now ||
          c.startDate > now,
      );

      if (invalidCoupon) {
        return res
          .status(400)
          .json({ message: "One or more coupons are invalid or already used" });
      }

      discountAmount = coupons.reduce((sum, c) => sum + c.discountAmount, 0);
    }

    const isFreeCouponCheckout = paymentIntent.startsWith(
      FREE_COUPON_CHECKOUT_PREFIX,
    );

    if (isFreeCouponCheckout) {
      const sumPrices = dresses.reduce((sum, d) => sum + d.price, 0);
      if (discountAmount < sumPrices) {
        return res
          .status(400)
          .json({ message: "Coupons do not cover the total price" });
      }
    } else {
      const payment = await stripe.paymentIntents.retrieve(paymentIntent);

      if (payment.status !== "succeeded") {
        return res.status(400).json({
          message: "Payment not confirmed. Please try again.",
        });
      }
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
        blockOutPeriod: calculateBlockOutPeriod(dress.dateBooked),
        address: {
          company: dress.address?.company ?? "",
          address: dress.address?.address ?? "",
          apartment: dress.address?.apartment ?? "",
          suburb: dress.address?.suburb ?? "",
          city: dress.address?.city ?? "",
          country: dress.address?.country ?? "",
          postCode: dress.address?.postCode ?? "",
        },
        billingAddress: {
          company: dress.billingAddress.company ?? "",
          address: dress.billingAddress.address,
          apartment: dress.billingAddress.apartment ?? "",
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
        couponIds,
        discountAmount,
        instructions: dress.instructions ?? "",
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

    if (couponIds.length > 0) {
      await redeemCoupons(couponIds);
    }

    res
      .status(200)
      .json({ message: "Booking successful", booking: bookedDresses });
  } else if (req.method == "PATCH") {
    const isAdmin = await requireAdmin(req, res);
    if (!isAdmin) return;

    const bookingId = req.query.bookingId as string;
    const bookingObj = req.body.bookingObj;

    if (bookingObj?.dressId) {
      // Full booking edit (from EditBookingModal)
      const existingBooking = await BookingSchema.findById(bookingId);
      if (!existingBooking)
        return res
          .status(404)
          .send("The booking with the given ID was not found.");

      const {
        dressId,
        userId: bodyUserId,
        newUser,
        dateBooked,
        size,
        deliveryType,
        address,
        billingAddress,
        status,
        instructions,
      } = bookingObj;

      if (!dressId || !dateBooked || !size || !deliveryType) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (!bodyUserId && !newUser) {
        return res.status(400).json({
          message: "A customer or new customer details are required",
        });
      }

      let userId = bodyUserId;
      if (!userId && newUser) {
        const result = await createUser({
          email: newUser.email,
          name: `${newUser.firstName} ${newUser.lastName}`,
          mobileNumber: "",
          instagramHandle: "",
          role: "user",
        });
        userId =
          "insertedId" in result
            ? result.insertedId.toString()
            : result._id.toString();
      }

      const dress = await getDress(dressId);
      if (!dress) return res.status(404).json({ message: "Dress not found" });

      const blocked = await checkBlockOut(dressId, size, dateBooked);
      if (blocked)
        return res.status(409).json({
          message: "This date is blocked out for the selected size",
        });

      const duplicates = await checkDuplicateBooking(dressId, size, dateBooked);
      const conflicting = duplicates.filter(
        (d: any) => d._id.toString() !== bookingId,
      );
      if (conflicting.length > 0) {
        return res
          .status(409)
          .json({ message: "This date is already fully booked" });
      }

      const price = parseInt(dress.price);
      const blockOutPeriod = calculateBlockOutPeriod(dateBooked);

      const updatedBooking = await BookingSchema.findByIdAndUpdate(
        bookingId,
        {
          dressId,
          userId,
          dateBooked,
          size,
          deliveryType,
          price,
          blockOutPeriod,
          address: address ?? {},
          billingAddress: billingAddress ?? {},
          status: status ?? existingBooking.status,
          instructions: instructions ?? existingBooking.instructions ?? "",
        },
        { new: true },
      );

      return res.status(200).json({
        message: "Booking updated successfully",
        booking: updatedBooking,
      });
    }

    // Lightweight partial patch (e.g. status-only, from the row Dropdown) — unchanged behavior.
    const booking = await getBookingsById(bookingId);

    if (!booking)
      return res
        .status(404)
        .send("The booking with the given ID was not found.");

    for (let key in bookingObj) {
      booking[key] = bookingObj[key];
    }

    const filter = {
      _id: bookingId,
    };

    await BookingSchema.updateOne(filter, booking);

    res
      .status(200)
      .json({ message: "Booking updated successfully", booking: booking });
  } else if (req.method == "DELETE") {
    const isAdmin = await requireAdmin(req, res);
    if (!isAdmin) return;

    const bookingId = req.query.bookingId as string;

    const booking = await getBookingsById(bookingId);

    if (!booking)
      return res
        .status(404)
        .send("The booking with the given ID was not found.");

    await deleteBooking(bookingId);

    res.status(200).json({ message: "Booking deleted successfully" });
  } else {
    res.status(405).end();
  }
}
