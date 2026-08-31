import { vi } from "vitest";
import { db, nextId, type FakeBooking, type FakeCoupon } from "./db";

// Store-backed stand-ins for the modules the reserve talks to. Grouped by the
// module each one replaces so a vi.mock factory can return the group directly.
//
// These model each function's *contract*, not its query. Where production
// expresses a rule as a Mongo filter, the rule is re-stated here in plain
// JavaScript — which is the point of mocking at this seam, and also its limit:
// see the note at the top of ./db.ts.

// ------------------------------------------------------------------ operators

// Enough of Mongo's comparison operators to honour the guards that production
// puts on its writes, since those guards are exactly what the tests are about.
// $ne: null excludes a missing field too, as Mongo does.
function matchesFilter(doc: any, filter: Record<string, any>): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (condition && typeof condition === "object" && "$ne" in condition) {
      const forbidden = (condition as any).$ne;
      if (forbidden === null) return doc[key] !== null && doc[key] !== undefined;
      return doc[key] !== forbidden;
    }
    return doc[key] === condition;
  });
}

// ------------------------------------------------------------- lib/db/schema

// Narrow on purpose: only the calls the routes under test actually make on
// BookingSchema. Anything else should fail loudly rather than quietly no-op.
export const BookingSchema = {
  async updateOne(
    filter: Record<string, any>,
    update: Partial<FakeBooking>,
    options?: { upsert?: boolean },
  ) {
    const existing = db.bookings.find((b) => matchesFilter(b, filter));

    if (existing) {
      Object.assign(existing, update);
      return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    }

    if (!options?.upsert) {
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }

    const inserted = { ...(update as FakeBooking) };
    db.bookings.push({ ...inserted, _id: inserted._id ?? nextId() });
    return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
  },

  async deleteOne(filter: Record<string, any>) {
    const index = db.bookings.findIndex((b) => matchesFilter(b, filter));
    if (index === -1) return { deletedCount: 0 };

    db.bookings.splice(index, 1);
    return { deletedCount: 1 };
  },

  async updateMany(filter: Record<string, any>, update: Record<string, any>) {
    const matched = db.bookings.filter((b) => matchesFilter(b, filter));
    const set = update.$set ?? update;

    for (const booking of matched) Object.assign(booking, set);

    return { matchedCount: matched.length, modifiedCount: matched.length };
  },

  async findById(id: string) {
    return db.bookings.find((b) => b._id === id) ?? null;
  },
};

export const UserSchema = {
  findById(id: string) {
    return {
      lean: async () => db.users.find((u) => u._id === String(id)) ?? null,
    };
  },
};

// TryOnBookingSchema is appended to this below, where it is defined.
export const schemaModule: Record<string, unknown> = { BookingSchema, UserSchema };

// ------------------------------------------------- lib/db/tryon-booking-dao

export const deleteTryOnReservation = vi.fn(async (paymentIntent: string) => {
  const index = db.tryOnBookings.findIndex(
    (b) =>
      b.paymentIntent === paymentIntent &&
      b.paymentSuccess !== true &&
      b.reservedAt != null,
  );
  if (index === -1) return { deletedCount: 0 };

  db.tryOnBookings.splice(index, 1);
  return { deletedCount: 1 };
});

export const grantTryOnCoupon = vi.fn(async () => undefined);

export const tryOnBookingDao = {
  deleteTryOnReservation,
  grantTryOnCoupon,
  getTryOnBookingByPaymentIntent: async (paymentIntent: string) =>
    db.tryOnBookings.find((b) => b.paymentIntent === paymentIntent) ?? null,
  getTakenTryOnSlots: async (date: string) =>
    db.tryOnBookings.filter((b) => b.date === date),
  checkTryOnSlotTaken: async (
    date: string,
    timeSlot: string,
    excludePaymentIntent?: string,
  ) =>
    db.tryOnBookings.filter(
      (b) =>
        b.date === date &&
        b.timeSlot === timeSlot &&
        (!excludePaymentIntent || b.paymentIntent !== excludePaymentIntent),
    ),
  findOwnTryOnHolds: async (
    userId: string,
    date: string,
    timeSlot: string,
    excludePaymentIntent: string,
  ) =>
    db.tryOnBookings
      .filter(
        (b) =>
          String(b.userId) === String(userId) &&
          b.date === date &&
          b.timeSlot === timeSlot &&
          b.paymentSuccess !== true &&
          b.reservedAt != null &&
          b.paymentIntent !== excludePaymentIntent,
      )
      .map((b) => b.paymentIntent),
  findLapsedTryOnReservations: async (cutoff: string) =>
    db.tryOnBookings
      .filter(
        (b) =>
          b.paymentSuccess !== true &&
          b.reservedAt != null &&
          b.reservedAt < cutoff,
      )
      .map((b) => b.paymentIntent),
};

// The unique index on { date, timeSlot } lives in MongoDB, so the fake raises
// the duplicate-key error the route catches rather than pretending to enforce
// it. Tests turn it on explicitly; nothing here can prove the real index fires.
export const tryOnSlotIndexViolation = { active: false };

export const TryOnBookingSchema = {
  async findOneAndUpdate(
    filter: Record<string, any>,
    update: Record<string, any>,
    _options?: { upsert?: boolean; new?: boolean },
  ) {
    const set = update.$set ?? {};
    const setOnInsert = update.$setOnInsert ?? {};
    const existing = db.tryOnBookings.find((b) =>
      matchesFilter(b, filter),
    );

    if (existing) {
      Object.assign(existing, set);
      return existing;
    }

    if (tryOnSlotIndexViolation.active) {
      throw Object.assign(new Error("E11000 duplicate key error"), {
        code: 11000,
      });
    }

    const inserted = { _id: nextId(), ...setOnInsert, ...set } as any;
    db.tryOnBookings.push(inserted);
    return inserted;
  },
};

schemaModule.TryOnBookingSchema = TryOnBookingSchema;

export const tryOnAvailabilityDao = {
  getAvailabilityForDate: vi.fn(async (date: string) => ({
    date,
    timeSlots: ["18:00", "18:30", "19:00"],
  })),
  getAllTryOnAvailability: async () => [],
};

// -------------------------------------- cart-dao / orderNumber / email stubs

export const removeItemFromCartByFields = vi.fn(async () => undefined);

export const cartDao = { removeItemFromCartByFields };

let orderNumberSequence = 1000;
export const getNextOrderNumber = vi.fn(async () => ++orderNumberSequence);
export const orderNumberModule = { getNextOrderNumber };

// Typed parameter so tests can inspect what was sent to whom.
export const sendEmail = vi.fn(
  async (_payload: { to?: string[]; subject?: string; [key: string]: unknown }) => ({
    id: "email_1",
  }),
);
// Resend is constructed with `new`, so this cannot be an arrow function.
const ResendConstructor = vi.fn(function (this: any) {
  this.emails = { send: sendEmail };
});
export const resendModule = { Resend: ResendConstructor };

// -------------------------------------------------------- lib/db/booking-dao

// Item-level rows, matching the $unwind/$project the real aggregate returns.
async function getBookingAvailabilityByDress(
  dressId: string,
  excludePaymentIntent?: string,
) {
  return db.bookings
    .filter(
      (b) => !excludePaymentIntent || b.paymentIntent !== excludePaymentIntent,
    )
    .flatMap((b) =>
      b.items
        .filter((item) => item.dressId === dressId)
        .map((item) => ({
          paymentIntent: b.paymentIntent,
          paymentSuccess: b.paymentSuccess,
          reservedAt: b.reservedAt,
          dressId: item.dressId,
          size: item.size,
          dateBooked: item.dateBooked,
          blockedFrom: item.blockedFrom,
          blockedUntil: item.blockedUntil,
        })),
    );
}

async function checkDuplicateBooking(
  dressId: string,
  size: string,
  date: string,
  excludeBookingId?: string,
  excludePaymentIntent?: string,
) {
  return db.bookings.filter(
    (b) =>
      (!excludeBookingId || b._id !== excludeBookingId) &&
      (!excludePaymentIntent || b.paymentIntent !== excludePaymentIntent) &&
      b.items.some(
        (item) =>
          item.dressId === dressId &&
          item.size === size &&
          item.dateBooked === date,
      ),
  );
}

async function findOwnBookingHolds(
  userId: string,
  items: { dressId: string; size?: string; dateBooked: string }[],
  excludePaymentIntent: string,
): Promise<string[]> {
  if (items.length === 0) return [];

  return db.bookings
    .filter(
      (b) =>
        b.userId === userId &&
        b.paymentSuccess !== true &&
        b.reservedAt != null &&
        b.paymentIntent !== excludePaymentIntent &&
        b.items.some((row) =>
          items.some(
            (query) =>
              query.dressId === row.dressId &&
              query.size === row.size &&
              query.dateBooked === row.dateBooked,
          ),
        ),
    )
    .map((b) => b.paymentIntent);
}

async function findLapsedReservations(cutoff: string): Promise<string[]> {
  return db.bookings
    .filter(
      (b) =>
        b.paymentSuccess !== true &&
        b.reservedAt != null &&
        b.reservedAt < cutoff,
    )
    .map((b) => b.paymentIntent);
}

async function getBookingsById(bookingId: string) {
  return db.bookings.find((b) => b._id === bookingId) ?? null;
}

async function getBookingsByPaymentIntent(paymentIntent: string) {
  return db.bookings.filter((b) => b.paymentIntent === paymentIntent);
}

async function deleteBooking(bookingId: string) {
  const index = db.bookings.findIndex((b) => b._id === bookingId);
  return index === -1 ? null : db.bookings.splice(index, 1)[0];
}

async function removeBookingItem(bookingId: string, itemId: string) {
  return db.bookings.find((b) => b._id === bookingId) ?? null;
}

export const bookingDao = {
  getBookingAvailabilityByDress,
  checkDuplicateBooking,
  findOwnBookingHolds,
  findLapsedReservations,
  getBookingsById,
  getBookingsByPaymentIntent,
  deleteBooking,
  removeBookingItem,
};

// --------------------------------------------------------- lib/db/coupon-dao

const liveClaims = (
  coupon: FakeCoupon,
  now: string,
  excludePaymentIntent: string,
) =>
  (coupon.pendingClaims ?? []).filter(
    (c) => c.expiresAt > now && c.paymentIntent !== excludePaymentIntent,
  );

// Re-states the conditions the real findOneAndUpdate filter expresses. It is
// NOT atomic — see ./db.ts. What it does give the tests is a faithful yes/no:
// a claim is refused in exactly the cases production would refuse it.
export const claimCoupon = vi.fn(
  async (
    couponRef: { _id: any; isGlobal?: boolean; maxRedemptions?: number },
    userId: string,
    paymentIntent: string,
    expiresAt: string,
    now: string,
  ): Promise<boolean> => {
    const coupon = db.coupons.find((c) => c._id === String(couponRef._id));
    if (!coupon) return false;

    if (!(coupon.startDate <= now && coupon.expiryDate >= now)) return false;

    const capacity = coupon.isGlobal ? (coupon.maxRedemptions ?? 0) : 1;
    const others = liveClaims(coupon, now, paymentIntent);

    if (coupon.isGlobal) {
      if ((coupon.redeemedByUserIds ?? []).some((id) => String(id) === userId)) {
        return false;
      }
      // A slot already held by another checkout of theirs blocks a second one;
      // their claim under *this* intent is excluded above, so a retry is fine.
      if (others.some((c) => String(c.userId) === userId)) return false;
    } else if (coupon.isRedeemed === true) {
      return false;
    }

    const spent = coupon.isGlobal
      ? (coupon.redeemedByUserIds ?? []).length
      : coupon.isRedeemed === true
        ? 1
        : 0;

    if (spent + others.length >= capacity) return false;

    coupon.pendingClaims = [...others, { userId, paymentIntent, expiresAt }];
    return true;
  },
);

export const releaseCouponClaims = vi.fn(async (paymentIntent: string) => {
  for (const coupon of db.coupons) {
    coupon.pendingClaims = (coupon.pendingClaims ?? []).filter(
      (c) => c.paymentIntent !== paymentIntent,
    );
  }
});

export const redeemCoupons = vi.fn(
  async (
    coupons: { _id: any; isGlobal?: boolean }[],
    userId: string,
    paymentIntent?: string,
  ) => {
    for (const ref of coupons) {
      const coupon = db.coupons.find((c) => c._id === String(ref._id));
      if (!coupon) continue;

      if (coupon.isGlobal) {
        coupon.redeemedByUserIds = Array.from(
          new Set([...(coupon.redeemedByUserIds ?? []), userId]),
        );
      } else {
        coupon.isRedeemed = true;
      }

      if (paymentIntent) {
        coupon.pendingClaims = (coupon.pendingClaims ?? []).filter(
          (c) => c.paymentIntent !== paymentIntent,
        );
      }
    }
  },
);

export const couponDao = {
  claimCoupon,
  releaseCouponClaims,
  redeemCoupons,
  getCouponsByIds: async (ids: string[]) =>
    db.coupons.filter((c) => ids.includes(c._id)),
  getCouponByCode: async (code: string) =>
    db.coupons.find(
      (c) => c.isGlobal && c.code === code.trim().toUpperCase(),
    ) ?? null,
  getAllCoupons: async () => db.coupons,
  getActiveCouponsByUser: async (userId: string) =>
    db.coupons.filter((c) => c.userId === userId),
  createCoupon: async (data: any) => data,
  deleteCoupon: async (id: string) => null,
};

// -------------------------------------------------- remaining mocked modules

export const userDao = {
  findUser: async (email: string) => db.users.filter((u) => u.email === email),
  createUser: vi.fn(async () => undefined),
  getAllUsers: async () => db.users,
};

export const blockoutDao = {
  checkBlockOut: async (dressId: string, size: string, date: string) =>
    db.blockouts.some(
      (b) => b.dressId === dressId && b.size === size && b.date === date,
    ),
};

export const sanityQuery = {
  getDress: async (dressId: string) => db.dresses.get(dressId) ?? null,
  getCatalogue: async () => Array.from(db.dresses.values()),
  // Narrowed deliberately, mirroring the real projection: a caller that reads
  // a display field off this should fail here rather than in production.
  getDressPricing: async (dressId: string) => {
    const dress = db.dresses.get(dressId);
    if (!dress) return null;
    const { _id, price, xs, s, m, l, xl } = dress;
    return { _id, price, xs, s, m, l, xl };
  },
};

export const resolveRuralDeliveryStatus = vi.fn(
  async (_dpid?: string, fallback = false) => ({
    isRural: fallback,
    verified: true,
  }),
);

export const nzpostClient = { resolveRuralDeliveryStatus };

export function resetDaoSpies() {
  claimCoupon.mockClear();
  releaseCouponClaims.mockClear();
  redeemCoupons.mockClear();
  userDao.createUser.mockClear();
  deleteTryOnReservation.mockClear();
  grantTryOnCoupon.mockClear();
  // mockReset, not mockClear: a test that overrides this with mockResolvedValue
  // would otherwise leak its answer into every test after it.
  tryOnAvailabilityDao.getAvailabilityForDate.mockReset();
  tryOnAvailabilityDao.getAvailabilityForDate.mockImplementation(
    async (date: string) => ({ date, timeSlots: ["18:00", "18:30", "19:00"] }),
  );
  tryOnSlotIndexViolation.active = false;
  removeItemFromCartByFields.mockClear();
  getNextOrderNumber.mockClear();
  orderNumberSequence = 1000;
  sendEmail.mockClear();
  resolveRuralDeliveryStatus.mockClear();
  resolveRuralDeliveryStatus.mockImplementation(
    async (_dpid?: string, fallback = false) => ({
      isRural: fallback,
      verified: true,
    }),
  );
}
