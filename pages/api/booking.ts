import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../lib/db/db";
import { BookingSchema } from "../../lib/db/schema";
import { IBooking, IBookingItem } from "../../common/interfaces/user";
import {
  checkDuplicateBooking,
  deleteBooking,
  findLapsedReservations,
  findOwnBookingHolds,
  getBookingAvailabilityByDress,
  getBookingsById,
  removeBookingItem,
} from "../../lib/db/booking-dao";
import { Booking, BookingAvailability } from "../../common/types";
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { auckland } from "../../lib/utils/timezone";
import {
  calculateCouponDiscount,
  isCouponUsableByUser,
} from "../../lib/utils/couponRules";
import {
  lapsedReservationCutoff,
  reservationExpiry,
} from "../../lib/utils/reservation";
import { reconcileReservation } from "../../lib/booking/reconcileReservation";
import { createUser, findUser } from "../../lib/db/user-dao";
import {
  claimCoupon,
  getCouponsByIds,
  releaseCouponClaims,
} from "../../lib/db/coupon-dao";
import { AccountType } from "../../common/enums/AccountType";
import { getDress } from "../../sanity/sanity.query";
import { checkBlockOut } from "../../lib/db/blockout-dao";
import { calculateBookingWindow } from "../../lib/utils/bookingWindow";
import {
  isBookingAvailable,
  outranksReservation,
  ReservationRank,
} from "../../lib/utils/checkBookingAvailability";
import {
  calculateShippingFee,
  hasDeliveryItem,
  isBookingAllowedForDate,
} from "../../lib/utils/deliveryRules";
import { resolveRuralDeliveryStatus } from "../../lib/nzpost/client";

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
      return res.status(200).json([]);
    }

    const bookingItems = bookings as BookingAvailability[];

    res.status(200).json(bookingItems);
  } else if (req.method == "POST") {
    // Checkout's reserve step. Everything that could make this order
    // impossible — an exhausted coupon, a dress taken since the customer
    // opened the page, a blocked-out date — is settled here, BEFORE the card
    // is charged. A reservation that fails costs the customer nothing; one
    // that fails after the charge costs them money we then have to give back.
    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bookingPayload = req.body.booking as Booking;
    const items = bookingPayload.items;
    const paymentIntent = req.body.paymentIntent as string;
    const couponIds = (req.body.couponIds as string[] | undefined) ?? [];

    if (!paymentIntent) {
      return res.status(400).json({ message: "paymentIntent is required" });
    }

    const users = await findUser(session.user.email);
    const user = users[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const reservingUserId = user._id.toString();

    const now = auckland.now().toISOString();
    var errorResponse: String[] = [];

    // Notice-from-today. The Calendar and the checkout form apply this too, but
    // both evaluate in a browser: a cart left open past 8pm, a stale tab, or a
    // hand-made request would otherwise reserve and charge for a date we can no
    // longer dispatch in time. Evaluated against a single instant so a
    // multi-item order can't straddle the cutoff, and placed ahead of the price
    // lookup and every side effect — a failure here unwinds nothing.
    const pastCutoff = items
      .filter(
        (item) =>
          !isBookingAllowedForDate(
            item.dateBooked,
            item.deliveryType,
            auckland.toZone(now),
          ),
      )
      .map((item) => item.dressId);

    if (pastCutoff.length > 0) {
      return res.status(409).json({
        message:
          "It's too late to book one or more of these dates. Please choose another date. You have not been charged.",
        body: pastCutoff,
      });
    }

    // Resolve the authoritative price for each dress from Sanity. The client
    // sends item.price, but it must never be trusted for money: otherwise a
    // shopper could tamper with the payload (and the matching PaymentIntent)
    // to rent any dress for the Stripe minimum. Every downstream figure —
    // subtotal, coupon coverage, persisted price, and the amount the card is
    // actually charged — is derived from this map.
    const dressPriceById = new Map<string, number>();
    for (const item of items) {
      if (!dressPriceById.has(item.dressId)) {
        const dress = await getDress(item.dressId);
        if (!dress) {
          return res.status(404).json({ message: "Dress not found" });
        }
        const price = Number(dress.price);
        if (!Number.isFinite(price)) {
          return res
            .status(500)
            .json({ message: "Dress is missing a price" });
        }
        dressPriceById.set(item.dressId, price);
      }
    }
    const priceForItem = (item: (typeof items)[number]) =>
      dressPriceById.get(item.dressId)!;

    const itemsSubtotal = items.reduce(
      (sum, item) => sum + priceForItem(item),
      0,
    );

    // A customer must not be blocked by their own abandoned attempt: they
    // reserve, their card is declined, and their own ghost hold then tells them
    // the dress is already booked. Reconciled rather than deleted, because
    // those reservations still have live PaymentIntents that must be cancelled
    // before their rows can safely go.
    const ownHolds = await findOwnBookingHolds(
      reservingUserId,
      items,
      paymentIntent,
    );
    for (const hold of ownHolds) {
      await reconcileReservation(hold);
    }

    // Availability gates run before anything with a side effect, so a failure
    // here needs no unwinding. Each check ignores this checkout's own
    // reservation, which may already exist from a previous attempt.
    // `outranking` is only passed on the post-write re-check; see there.
    const checkAvailability = async (outranking?: ReservationRank) => {
      const unavailable: String[] = [];

      for (const item of items) {
        const duplicates = (
          await checkDuplicateBooking(
            item.dressId,
            item.size,
            item.dateBooked,
            undefined,
            paymentIntent,
          )
        ).filter(
          (row: any) => !outranking || outranksReservation(row, outranking),
        );

        const blockedOut = await checkBlockOut(
          item.dressId,
          item.size as string,
          item.dateBooked,
        );

        const available = await isBookingAvailable(
          item.dressId,
          item.size as string,
          item.dateBooked,
          item.deliveryType,
          paymentIntent,
          outranking,
        );

        if (duplicates.length > 0 || blockedOut || !available) {
          unavailable.push(item.dressId);
        }
      }

      return unavailable;
    };

    errorResponse = await checkAvailability();

    // Being blocked might just mean somebody else's checkout died holding this
    // date. Reservations only stop blocking once their payment has been proven
    // dead, so settle any that have outlived their window and look again —
    // otherwise a date stays unsellable until the cron happens to run, and a
    // scheduler outage would quietly take dates off sale.
    if (errorResponse.length > 0) {
      const lapsed = await findLapsedReservations(lapsedReservationCutoff(now));
      let freedAny = false;

      for (const hold of lapsed) {
        if (hold === paymentIntent) continue;
        if ((await reconcileReservation(hold)) === "cancelled") freedAny = true;
      }

      if (freedAny) errorResponse = await checkAvailability();
    }

    if (errorResponse.length > 0) {
      return res.status(409).json({
        message:
          "One or more dresses have already been booked for the selected day.",
        body: errorResponse,
      });
    }

    // Coupon slots are claimed here, not merely checked. A read-then-act
    // validation would let two customers checking out at the same instant both
    // be told yes and both redeem, taking a code past its limit — so each slot
    // is taken atomically by claimCoupon, and whoever loses that race is
    // stopped here with their card untouched.
    //
    // The claim lasts as long as the reservation it belongs to and is handed
    // back the moment that reservation dies, so an abandoned cart can't sit on
    // a one-use code.
    let discountAmount = 0;
    let coupons: any[] = [];

    if (couponIds.length > 0) {
      coupons = await getCouponsByIds(couponIds);

      if (coupons.length !== couponIds.length) {
        return res
          .status(400)
          .json({ message: "One or more coupons could not be found" });
      }

      const claimExpiresAt = reservationExpiry(now);

      for (const coupon of coupons) {
        const won = await claimCoupon(
          coupon,
          reservingUserId,
          paymentIntent,
          claimExpiresAt,
          now,
        );

        if (!won) {
          // Give back whatever this attempt managed to take, so a partial
          // failure across a multi-coupon order doesn't strand the others.
          await releaseCouponClaims(paymentIntent);

          return res.status(409).json({
            message:
              "This coupon is no longer available. You have not been charged.",
          });
        }
      }

      const itemPrices = items.map(priceForItem);
      discountAmount = calculateCouponDiscount(coupons, itemPrices);
    }

    // Re-confirm rural status with NZ Post (by DPID) rather than trusting the
    // client-supplied flag, since this is a real-money line item. Computed
    // once, before the free-coupon branch, so both fee calculations below
    // (coupon coverage check and the persisted totalPrice) agree.
    const shippingItemAddress = items.find(
      (item) => item.address?.nzPostDpid,
    )?.address;
    const { isRural: isRuralDelivery, verified: ruralVerified } =
      hasDeliveryItem(items)
        ? await resolveRuralDeliveryStatus(
            shippingItemAddress?.nzPostDpid,
            shippingItemAddress?.isRuralDelivery ?? false,
          )
        : { isRural: false, verified: true };

    if (!ruralVerified) {
      console.warn(
        "NZ Post rural re-verification unavailable; falling back to client-supplied flag",
        { paymentIntent, dpid: shippingItemAddress?.nzPostDpid },
      );
    }

    // Every exit from here on has to hand the coupon slots back. They were
    // taken on the assumption this reservation would complete, and a code that
    // stays locked for fifteen minutes because a checkout fell over downstream
    // is the same unavailable-coupon bug wearing a different hat.
    const abandon = async (status: number, body: Record<string, unknown>) => {
      await releaseCouponClaims(paymentIntent);
      return res.status(status).json(body);
    };

    const isFreeCouponCheckout = paymentIntent.startsWith(
      FREE_COUPON_CHECKOUT_PREFIX,
    );

    if (isFreeCouponCheckout) {
      const sumPrices =
        itemsSubtotal +
        calculateShippingFee(hasDeliveryItem(items), isRuralDelivery);
      if (discountAmount < sumPrices) {
        return abandon(400, {
          message: "Coupons do not cover the total price",
        });
      }
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
        nzPostAddressId: item.address?.nzPostAddressId,
        nzPostDpid: item.address?.nzPostDpid,
        // Overwritten with the server-verified value for the item(s) sharing
        // the checkout's shipping address, rather than trusting the client.
        isRuralDelivery: item.address?.nzPostDpid ? isRuralDelivery : false,
        ruralDeliveryNumber: item.address?.ruralDeliveryNumber,
      },
      size: item.size,
      price: priceForItem(item),
      instructions: item.instructions ?? "",
    }));

    const shippingFee = calculateShippingFee(
      hasDeliveryItem(bookingItems),
      isRuralDelivery,
    );

    // Floored at zero, because a flat coupon can be worth more than the cart it
    // is spent on: calculateCouponDiscount caps a SingleItem-scoped flat amount
    // at its target item but returns a cart-scoped one at face value, so a $200
    // credit against a $150 rental subtracts the full $200. Without the floor
    // that lands in the row as totalPrice: -50 — which the customer never sees
    // (OrderSummary already floors what it displays) but every admin total that
    // sums this column does.
    const totalPrice = Math.max(
      0,
      bookingItems.reduce((sum, item) => sum + item.price, 0) +
        shippingFee -
        discountAmount,
    );

    // The server, not the browser, decides what the card is charged. The
    // intent was created with a client-computed figure just to render the
    // payment form; here it is pinned to the total we just derived from Sanity
    // prices and server-verified rural status.
    //
    // Refusing to raise the amount is what makes the quoted total binding: if
    // the server arrives at more than the customer was shown, they get sent
    // back to re-quote rather than silently charged the difference. Lowering
    // is safe and always in their favour.
    const totalCents = Math.round(totalPrice * 100);

    if (!isFreeCouponCheckout) {
      const payment = await stripe.paymentIntents.retrieve(paymentIntent);

      if (payment.status === "succeeded") {
        // Already charged — nothing left to pin, so fall back to reconciling.
        // Only reachable while the client still pays before reserving; once
        // the reserve moves ahead of the charge this branch goes quiet.
        if (payment.amount !== totalCents) {
          console.error(
            "Stripe charge amount does not match server-verified booking total",
            {
              paymentIntent,
              stripeAmountCents: payment.amount,
              verifiedTotalCents: totalCents,
            },
          );
          return abandon(400, {
            message:
              "Payment amount does not match the order total. No booking was created — please contact us if you were charged.",
          });
        }
      } else if (payment.amount !== totalCents) {
        if (totalCents > payment.amount) {
          console.error("Server total exceeds the amount quoted to the customer", {
            paymentIntent,
            quotedCents: payment.amount,
            verifiedTotalCents: totalCents,
          });
          return abandon(409, {
            message:
              "The total for this order has changed. Please go back and check out again. You have not been charged.",
          });
        }

        try {
          await stripe.paymentIntents.update(paymentIntent, {
            amount: totalCents,
          });
        } catch (err) {
          console.error("Failed to set the Stripe amount for a reservation", err);
          return abandon(500, {
            message:
              "We couldn't prepare your payment. Please try again. You have not been charged.",
          });
        }
      }
    }

    const booking: IBooking = {
      // From the session, not the payload. The client sends a userId, but this
      // row decides whose booking it is and whose coupon slot was spent, so it
      // has to come from the authenticated caller.
      userId: reservingUserId,
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
      // Marks this as a hold rather than a booking. It blocks the dress while
      // the customer pays, and lapses on its own if they never come back.
      reservedAt: now,
      status: bookingPayload.status,
      couponIds,
      discountAmount,
    };

    // Upsert on paymentIntent so a retry refreshes the reservation in place
    // rather than stacking a second one. The order number is deliberately not
    // allocated here — an abandoned checkout shouldn't consume one — so it is
    // assigned when the payment is confirmed.
    try {
      await BookingSchema.updateOne(
        { paymentIntent },
        booking,
        { upsert: true },
      );
    } catch (err) {
      console.error("Failed to write reservation", err);
      return abandon(500, {
        message:
          "We couldn't hold your booking. Please try again. You have not been charged.",
      });
    }

    // The availability check above and this write aren't one atomic operation,
    // so two simultaneous reserves can both pass it and both write. Availability
    // is a count against per-size stock across overlapping blocking windows,
    // which no single-document guard can express — so verify afterwards instead.
    //
    // Safe to do the work and then undo it precisely because nothing has been
    // charged yet. Counting only rows that outrank this reservation is what
    // stops both racers standing down: the ordering is total, so exactly one of
    // them concludes it should give way.
    const contested = await checkAvailability({ reservedAt: now, paymentIntent });

    if (contested.length > 0) {
      await BookingSchema.deleteOne({
        paymentIntent,
        paymentSuccess: { $ne: true },
        reservedAt: { $ne: null },
      });

      console.warn("Lost a concurrent race for a dress date; reservation undone", {
        paymentIntent,
        dressIds: contested,
      });

      // The intent is deliberately left alive: nothing was charged, and the
      // customer needs it to retry with a different date.
      return abandon(409, {
        message:
          "One or more dresses have already been booked for the selected day.",
        body: contested,
      });
    }

    res.status(200).json({ message: "Booking reserved", booking });
  } else if (req.method == "PATCH") {
    const isAdmin = await requireAdmin(req, res);
    if (!isAdmin) return;

    const bookingId = req.query.bookingId as string;
    const bookingObj = req.body.bookingObj;

    if (Array.isArray(bookingObj?.items)) {
      // Full booking edit (from EditBookingModal) — a booking can hold multiple dresses.
      const existingBooking = await BookingSchema.findById(bookingId);
      if (!existingBooking)
        return res
          .status(404)
          .send("The booking with the given ID was not found.");

      const {
        items: itemsPayload,
        userId: bodyUserId,
        newUser,
        deliveryType,
        address,
        billingAddress,
        status,
        instructions,
      } = bookingObj;

      if (itemsPayload.length === 0) {
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
        return res.status(400).json({
          message: "A customer or new customer details are required",
        });
      }

      const seen = new Set<string>();
      for (const item of itemsPayload) {
        const key = `${item.dressId}|${item.size}|${item.dateBooked}`;
        if (seen.has(key)) {
          return res.status(400).json({
            message:
              "The same dress, size and date was selected more than once",
          });
        }
        seen.add(key);
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

      const existingItemsById = new Map<string, any>(
        existingBooking.items.map((item: any) => [item._id.toString(), item]),
      );

      const bookingItems = [];
      for (const item of itemsPayload) {
        const dress = await getDress(item.dressId);
        if (!dress) return res.status(404).json({ message: "Dress not found" });

        const blocked = await checkBlockOut(
          item.dressId,
          item.size,
          item.dateBooked,
        );
        if (blocked)
          return res.status(409).json({
            message: "This date is blocked out for the selected size",
          });

        const duplicates = await checkDuplicateBooking(
          item.dressId,
          item.size,
          item.dateBooked,
          bookingId,
        );
        if (duplicates.length > 0) {
          return res
            .status(409)
            .json({ message: "This date is already fully booked" });
        }

        const price = parseInt(dress.price);
        const { blockedFrom, blockedUntil } = calculateBookingWindow(
          item.dateBooked,
          deliveryType,
        );
        const existingItem = item.itemId
          ? existingItemsById.get(item.itemId)
          : undefined;

        bookingItems.push({
          _id: existingItem?._id,
          dressId: item.dressId,
          dateBooked: item.dateBooked,
          blockedFrom,
          blockedUntil,
          deliveryType,
          address: address ?? {},
          size: item.size,
          price,
          instructions: instructions ?? existingItem?.instructions ?? "",
          notes: item.notes ?? existingItem?.notes ?? "",
        });
      }

      // TODO: doesn't re-add SHIPPING_FEE (or a rural surcharge) — pre-existing gap.
      // existingBooking.discountAmount is the dollar figure already resolved
      // (flat or percentage-of-subtotal) at original checkout time — coupons
      // aren't re-fetched/re-evaluated here, so discountType is irrelevant.
      // Floored for the same reason as the reserve above, and more easily hit
      // here: an admin removing an item shrinks the subtotal while the original
      // discountAmount stays put.
      const totalPrice = Math.max(
        0,
        bookingItems.reduce((sum, item) => sum + item.price, 0) -
          (existingBooking.discountAmount ?? 0),
      );

      const updatedBooking = await BookingSchema.findByIdAndUpdate(
        bookingId,
        {
          userId,
          items: bookingItems,
          totalPrice,
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
