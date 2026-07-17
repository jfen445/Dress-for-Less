import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../lib/db/db";
import { BookingSchema } from "../../lib/db/schema";
import { IBooking, IBookingItem } from "../../common/interfaces/user";
import {
  checkDuplicateBooking,
  deleteBooking,
  getBookingAvailabilityByDress,
  getBookingsById,
  removeBookingItem,
} from "../../lib/db/booking-dao";
import { Booking, BookingAvailability } from "../../common/types";
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { auckland } from "../../lib/utils/timezone";
import { isCouponActive } from "../../lib/utils/couponRules";
import { createUser, findUser } from "../../lib/db/user-dao";
import { getCouponsByIds, redeemCoupons } from "../../lib/db/coupon-dao";
import { AccountType } from "../../common/enums/AccountType";
import { getDress } from "../../sanity/sanity.query";
import { checkBlockOut } from "../../lib/db/blockout-dao";
import { calculateBookingWindow } from "../../lib/utils/bookingWindow";
import { isBookingAvailable } from "../../lib/utils/checkBookingAvailability";
import { hasDeliveryItem, SHIPPING_FEE } from "../../lib/utils/deliveryRules";

const FREE_COUPON_CHECKOUT_PREFIX = "FREE_COUPON_";

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

    const bookingPayload = req.body.booking as Booking;
    const items = bookingPayload.items;
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

      const now = auckland.now().toISOString();
      const invalidCoupon = coupons.find(
        (c) =>
          c.userId.toString() !== user._id.toString() || !isCouponActive(c, now),
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
      const sumPrices =
        items.reduce((sum, item) => sum + item.price, 0) +
        (hasDeliveryItem(items) ? SHIPPING_FEE : 0);
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

    for (const item of items) {
      const checkBooking = await checkDuplicateBooking(
        item.dressId,
        item.size,
        item.dateBooked,
      );

      const available = await isBookingAvailable(
        item.dressId,
        item.size as string,
        item.dateBooked,
        item.deliveryType,
      );

      if (checkBooking.length > 0 || !available) {
        errorResponse.push(item.dressId);
      }
    }

    if (errorResponse.length > 0) {
      return res.status(404).json({
        message: "This dressed has already been booked the the selected day. ",
        body: errorResponse,
      });
    }

    const bookingItems: IBookingItem[] = items.map((item) => ({
      dressId: item.dressId,
      dateBooked: item.dateBooked,
      ...calculateBookingWindow(item.dateBooked, item.deliveryType),
      deliveryType: String(item.deliveryType),
      address: item.address && {
        company: item.address?.company ?? "",
        address: item.address?.address ?? "",
        apartment: item.address?.apartment ?? "",
        suburb: item.address?.suburb ?? "",
        city: item.address?.city ?? "",
        country: item.address?.country ?? "",
        postCode: item.address?.postCode ?? "",
      },
      size: item.size,
      price: item.price,
      instructions: item.instructions ?? "",
    }));

    const shippingFee = hasDeliveryItem(bookingItems) ? SHIPPING_FEE : 0;

    const totalPrice =
      bookingItems.reduce((sum, item) => sum + item.price, 0) +
      shippingFee -
      discountAmount;

    const booking: IBooking = {
      userId: bookingPayload.userId,
      items: bookingItems,
      totalPrice,
      billingAddress: {
        company: bookingPayload.billingAddress.company ?? "",
        address: bookingPayload.billingAddress.address,
        apartment: bookingPayload.billingAddress.apartment ?? "",
        suburb: bookingPayload.billingAddress.suburb,
        city: bookingPayload.billingAddress.city,
        country: bookingPayload.billingAddress.country,
        postCode: bookingPayload.billingAddress.postCode,
      },
      tracking: bookingPayload.tracking,
      isShipped: bookingPayload.isShipped,
      isReturned: bookingPayload.isReturned,
      paymentIntent,
      paymentSuccess: false,
      status: bookingPayload.status,
      couponIds,
      discountAmount,
    };

    const filter = { paymentIntent };
    const options = { upsert: true };

    await BookingSchema.updateOne(filter, booking, options);

    if (couponIds.length > 0) {
      await redeemCoupons(couponIds);
    }

    res.status(200).json({ message: "Booking successful", booking });
  } else if (req.method == "PATCH") {
    const isAdmin = await requireAdmin(req, res);
    if (!isAdmin) return;

    const bookingId = req.query.bookingId as string;
    const bookingObj = req.body.bookingObj;

    if (bookingObj?.dressId) {
      // Full booking edit (from EditBookingModal) — admin bookings always have exactly one item.
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

      const duplicates = await checkDuplicateBooking(
        dressId,
        size,
        dateBooked,
        bookingId,
      );
      if (duplicates.length > 0) {
        return res
          .status(409)
          .json({ message: "This date is already fully booked" });
      }

      const price = parseInt(dress.price);
      const { blockedFrom, blockedUntil } = calculateBookingWindow(dateBooked, deliveryType);
      const existingItem = existingBooking.items[0];

      const updatedBooking = await BookingSchema.findByIdAndUpdate(
        bookingId,
        {
          userId,
          "items.0": {
            _id: existingItem?._id,
            dressId,
            dateBooked,
            blockedFrom,
            blockedUntil,
            deliveryType,
            address: address ?? {},
            size,
            price,
            instructions: instructions ?? existingItem?.instructions ?? "",
          },
          totalPrice: price - (existingBooking.discountAmount ?? 0),
          billingAddress: billingAddress ?? {},
          status: status ?? existingBooking.status,
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
    const itemId = req.query.itemId as string | undefined;

    const booking = await getBookingsById(bookingId);

    if (!booking)
      return res
        .status(404)
        .send("The booking with the given ID was not found.");

    if (itemId) {
      await removeBookingItem(bookingId, itemId);
    } else {
      await deleteBooking(bookingId);
    }

    res.status(200).json({ message: "Booking deleted successfully" });
  } else {
    res.status(405).end();
  }
}
