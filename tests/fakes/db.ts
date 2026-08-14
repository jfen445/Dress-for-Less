// The in-memory world the route tests run against.
//
// One shared store, because the reserve writes through BookingSchema directly
// and reads back through the DAO functions — if those two were faked
// independently the post-write re-check would be looking at a different world
// than the write landed in, and the race tests would prove nothing.
//
// What this deliberately does NOT model: atomicity. claimCoupon below grants a
// slot with a plain read-then-write, where production uses a single guarded
// findOneAndUpdate whose filter *is* the capacity condition. These fakes can
// show that the code does the right thing when a claim is refused; they cannot
// show that two simultaneous claims produce exactly one refusal. That property
// belongs to MongoDB and is out of scope for this suite by design.

export type FakeBookingItem = {
  dressId: string;
  size: string;
  dateBooked: string;
  deliveryType: string;
  blockedFrom: string;
  blockedUntil: string;
  price: number;
  address?: Record<string, unknown> | null;
  instructions?: string;
};

export type FakeBooking = {
  _id: string;
  userId: string;
  items: FakeBookingItem[];
  totalPrice: number;
  paymentIntent: string;
  paymentSuccess: boolean;
  reservedAt: string | null;
  couponIds?: string[];
  discountAmount?: number;
  orderNumber?: number;
  status?: string;
  billingAddress?: Record<string, unknown>;
};

export type FakeCouponClaim = {
  userId: string;
  paymentIntent: string;
  expiresAt: string;
};

export type FakeCoupon = {
  _id: string;
  userId?: string;
  code?: string;
  discountAmount: number;
  discountType: string;
  appliesTo?: string;
  isGlobal?: boolean;
  maxRedemptions?: number;
  isRedeemed?: boolean;
  redeemedByUserIds?: string[];
  pendingClaims?: FakeCouponClaim[];
  startDate: string;
  expiryDate: string;
};

export type FakeDress = {
  _id: string;
  price: string;
  [size: string]: unknown;
};

export type FakeUser = { _id: string; email: string; name?: string; role?: string };

export type FakeBlockout = { dressId: string; size: string; date: string };

export type FakeTryOnBooking = {
  _id: string;
  paymentIntent: string;
  userId: string;
  date: string;
  timeSlot: string;
  paymentSuccess: boolean;
  reservedAt: string | null;
};

type Store = {
  bookings: FakeBooking[];
  coupons: FakeCoupon[];
  dresses: Map<string, FakeDress>;
  users: FakeUser[];
  blockouts: FakeBlockout[];
  tryOnBookings: FakeTryOnBooking[];
};

export const db: Store = {
  bookings: [],
  coupons: [],
  dresses: new Map(),
  users: [],
  blockouts: [],
  tryOnBookings: [],
};

let idCounter = 0;
export const nextId = () => `id_${++idCounter}`;

export function resetDb() {
  db.bookings = [];
  db.coupons = [];
  db.dresses = new Map();
  db.users = [];
  db.blockouts = [];
  db.tryOnBookings = [];
  idCounter = 0;
}

// ---------------------------------------------------------------- seed helpers

export function seedUser(over: Partial<FakeUser> = {}): FakeUser {
  const user = { _id: nextId(), email: "customer@example.com", ...over };
  db.users.push(user);
  return user;
}

// Stock is per size, read as dress[size.toLowerCase()] by isBookingAvailable.
export function seedDress(over: Partial<FakeDress> = {}): FakeDress {
  const dress: FakeDress = {
    _id: over._id ?? nextId(),
    price: "150",
    xs: 1,
    s: 1,
    m: 1,
    l: 1,
    xl: 1,
    ...over,
  };
  db.dresses.set(dress._id, dress);
  return dress;
}

export function seedBooking(over: Partial<FakeBooking> = {}): FakeBooking {
  const booking: FakeBooking = {
    _id: nextId(),
    userId: "someone-else",
    items: [],
    totalPrice: 150,
    paymentIntent: `pi_${nextId()}`,
    paymentSuccess: false,
    reservedAt: null,
    ...over,
  };
  db.bookings.push(booking);
  return booking;
}

export function seedCoupon(over: Partial<FakeCoupon> = {}): FakeCoupon {
  const coupon: FakeCoupon = {
    _id: nextId(),
    discountAmount: 20,
    discountType: "flat",
    startDate: "2020-01-01T00:00:00.000Z",
    expiryDate: "2030-01-01T00:00:00.000Z",
    ...over,
  };
  db.coupons.push(coupon);
  return coupon;
}

export function seedTryOnBooking(
  over: Partial<FakeTryOnBooking> = {},
): FakeTryOnBooking {
  const booking: FakeTryOnBooking = {
    _id: nextId(),
    paymentIntent: `pi_tryon_${nextId()}`,
    userId: "someone-else",
    date: "2026-07-10",
    timeSlot: "10:00",
    paymentSuccess: false,
    reservedAt: null,
    ...over,
  };
  db.tryOnBookings.push(booking);
  return booking;
}

export const tryOnBookingFor = (paymentIntent: string) =>
  db.tryOnBookings.find((b) => b.paymentIntent === paymentIntent);

export const bookingFor = (paymentIntent: string) =>
  db.bookings.find((b) => b.paymentIntent === paymentIntent);

export const couponById = (id: string) => db.coupons.find((c) => c._id === id);
