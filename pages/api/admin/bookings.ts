import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";
import { getAllBookings } from "../../../lib/db/booking-dao";
import { createUser, findUser } from "../../../lib/db/user-dao";
import { getDress, getDressPricing } from "../../../sanity/sanity.query";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { AccountType } from "../../../common/enums/AccountType";
import { BookingSchema } from "../../../lib/db/schema";
import { BookingStatus } from "../../../common/enums/BookingStatus";
import { checkBlockOut } from "../../../lib/db/blockout-dao";
import {
  MAX_RENTAL_DAYS,
  calculateReturnDate,
  calculateWindowForRange,
  isReturnDayAllowed,
  rentalSpanDays,
} from "../../../lib/utils/bookingWindow";
import { findBlockingBookings } from "../../../lib/utils/checkBookingAvailability";
import { getNextOrderNumber } from "../../../lib/utils/orderNumber";
import { sendEmailConfirmation } from "../payment/paymentConfirm";

// Manual admin override - defaults to sanity pricing
const hasPriceOverride = (value: unknown) =>
  value !== undefined && value !== null && value !== "";

const isValidPrice = (value: unknown) =>
  Number.isFinite(Number(value)) && Number(value) >= 0;

const describeConflict = (row: any) => ({
  orderNumber: row.orderNumber,
  dateBooked: row.dateBooked,
  returnDate: row.returnDate,
  blockedFrom: row.blockedFrom,
  blockedUntil: row.blockedUntil,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user.email;

  if (!userEmail) {
    return res.status(401).json({ message: "User email not found in session" });
  }

  const user = await findUser(userEmail?.toString() ?? "");

  if (user.length === 0 || user[0].role !== AccountType.Admin) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }

  if (req.method === "GET") {
    const allBookings = await getAllBookings();

    const allBookingInfo = await Promise.all(
      allBookings.map(async (booking) => {
        const items = await Promise.all(
          booking.items.map(async (item: any) => {
            const dressInfo = await getDress(item.dressId);
            return { ...item, dress: dressInfo };
          }),
        );
        return { ...booking, items };
      }),
    );

    res.status(200).json(allBookingInfo);
  } else if (req.method === "POST") {
    const {
      items: itemsPayload,
      userId: bodyUserId,
      newUser,
      deliveryType,
      address,
      billingAddress,
      instructions,
    } = req.body;

    if (!Array.isArray(itemsPayload) || itemsPayload.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one dress is required" });
    }
    if (!deliveryType) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (
      itemsPayload.some(
        (item: any) => !item?.dressId || !item?.dateBooked || !item?.size,
      )
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!bodyUserId && !newUser) {
      return res
        .status(400)
        .json({ message: "A customer or new customer details are required" });
    }

    const seen = new Set<string>();
    for (const item of itemsPayload) {
      const key = `${item.dressId}|${item.size}|${item.dateBooked}`;
      if (seen.has(key)) {
        return res.status(400).json({
          message: "The same dress, size and date was selected more than once",
        });
      }
      seen.add(key);
    }

    // Checked before the customer row is created below, so a bad date or price
    // can't leave an orphaned user behind when the request then fails.
    for (const item of itemsPayload) {
      // Present only when an admin overrode it; otherwise the derived date
      // applies. Both gates below can only ever fire on an override — a derived
      // date is by construction the earliest one and never falls at a weekend.
      const earliestReturn = calculateReturnDate(item.dateBooked, deliveryType);
      const returnDate = item.returnDate || earliestReturn;

      if (returnDate < earliestReturn) {
        return res.status(400).json({
          message: `The dress cannot be returned before ${earliestReturn}`,
        });
      }
      if (!isReturnDayAllowed(returnDate, deliveryType)) {
        return res.status(400).json({
          message: "A posted return must fall on a weekday",
        });
      }
      if (rentalSpanDays(item.dateBooked, returnDate) > MAX_RENTAL_DAYS) {
        return res.status(400).json({
          message: `A rental cannot run longer than ${MAX_RENTAL_DAYS} days`,
        });
      }
      if (hasPriceOverride(item.price) && !isValidPrice(item.price)) {
        return res
          .status(400)
          .json({ message: "Price must be a number of zero or more" });
      }
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

    const bookingItems: any[] = [];
    for (const item of itemsPayload) {
      const dress = await getDressPricing(item.dressId);
      if (!dress) return res.status(404).json({ message: "Dress not found" });

      const returnDate =
        item.returnDate || calculateReturnDate(item.dateBooked, deliveryType);

      const blocked = await checkBlockOut(
        item.dressId,
        item.size,
        item.dateBooked,
        returnDate,
      );
      if (blocked)
        return res
          .status(409)
          .json({ message: "This date is blocked out for the selected size" });

      // Counts the whole span against per-size stock, where this used to test
      // the start date for an exact match only — which neither noticed a
      // booking overlapping on a different date nor allowed a second unit of a
      // dress with stock to spare.
      const { available, blocking } = await findBlockingBookings(
        item.dressId,
        item.size,
        item.dateBooked,
        deliveryType,
        // The lines already accepted from this same request aren't written
        // yet, so without them two overlapping lines would each be checked
        // against a world not containing the other, and both would pass.
        { alsoConsider: bookingItems, returnDate },
      );
      if (!available)
        return res.status(409).json({
          message:
            "This dress is already booked for one or more of those dates",
          conflicts: blocking.map(describeConflict),
        });

      const price = hasPriceOverride(item.price)
        ? Number(item.price)
        : parseInt(dress.price);
      const { blockedFrom, blockedUntil } = calculateWindowForRange(
        item.dateBooked,
        returnDate,
        deliveryType,
      );

      bookingItems.push({
        dressId: item.dressId,
        dateBooked: item.dateBooked,
        returnDate,
        blockedFrom,
        blockedUntil,
        deliveryType,
        address: address ?? {},
        size: item.size,
        price,
        instructions: instructions ?? "",
        notes: item.notes ?? "",
      });
    }

    const totalPrice = bookingItems.reduce((sum, item) => sum + item.price, 0);
    const orderNumber = await getNextOrderNumber();

    const booking = new BookingSchema({
      userId,
      orderNumber,
      items: bookingItems,
      totalPrice,
      billingAddress: billingAddress ?? {},
      tracking: "",
      isShipped: false,
      isReturned: false,
      paymentIntent: "ADMIN_MANUAL",
      paymentSuccess: true,
      status: BookingStatus.NA,
    });

    await booking.save();

    try {
      await sendEmailConfirmation(booking.toObject());
    } catch (err) {
      console.error(
        "Failed to send admin-created booking confirmation email",
        err,
      );
    }

    res.status(201).json({ message: "Booking created", booking });
  } else {
    res.setHeader("Allow", "GET, POST");
    res.status(405).end();
  }
}
