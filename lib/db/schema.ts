import mongoose from "mongoose";
import { CouponType } from "../../common/enums/CouponType";
import { CouponScope } from "../../common/enums/CouponScope";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true },
  // Never returned by default queries; must be explicitly `.select("+password")`.
  password: { type: String, required: false, select: false },
  name: { type: String, required: false },
  mobileNumber: { type: String, required: false },
  instagramHandle: { type: String, required: false },
  photo: { type: String, required: false },
  role: {
    type: String,
    enum: ["admin", "user"],
    required: true,
    default: "user",
  },
  // Epoch ms of the last password change. JWTs issued before this are treated
  // as signed out (see the session callback), so a reset ends existing sessions.
  passwordChangedAt: { type: Number, required: false },
});

const UserSchema =
  mongoose.models.AllUsers ?? mongoose.model("AllUsers", userSchema);

const addressSchema = new Schema({
  address: { type: String, required: false },
  suburb: { type: String, required: false },
  city: { type: String, required: false },
  country: { type: String, required: false },
  postCode: { type: String, required: false },
  company: { type: String, required: false },
  apartment: { type: String, required: false },
  nzPostAddressId: { type: String, required: false },
  nzPostDpid: { type: String, required: false },
  isRuralDelivery: { type: Boolean, required: false, default: false },
  ruralDeliveryNumber: { type: String, required: false },
});

const billingAddressSchema = new Schema({
  address: { type: String, required: false },
  suburb: { type: String, required: false },
  city: { type: String, required: false },
  country: { type: String, required: false },
  postCode: { type: String, required: false },
  company: { type: String, required: false },
  apartment: { type: String, required: false },
});

const bookingItemSchema = new Schema({
  dressId: { type: String, required: true },
  dateBooked: { type: String, required: true },
  blockedFrom: { type: String, required: true },
  blockedUntil: { type: String, required: true },
  deliveryType: { type: String, required: true, default: "delivery" },
  address: { type: addressSchema, required: false },
  size: { type: String, required: true },
  price: { type: Number, required: true },
  instructions: { type: String, required: false },
  notes: { type: String, required: false },
});

const bookingSchema = new Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, required: true },
    items: { type: [bookingItemSchema], required: true },
    totalPrice: { type: Number, required: true },
    billingAddress: { type: billingAddressSchema, required: false },
    tracking: { type: String, required: false },
    isShipped: { type: Boolean, required: true, default: false },
    isReturned: { type: Boolean, required: true, default: false },
    paymentIntent: { type: String, required: true },
    paymentSuccess: { type: Boolean, required: true, default: false },
    // Set when the row was written by checkout's reserve step, before payment.
    // Its presence is what makes an unpaid row eligible to be released or swept
    // once it lapses — rows predating the reservation scheme have no reservedAt
    // and keep blocking their date indefinitely, because some of them are real
    // bookings whose confirmation step never ran.
    reservedAt: { type: String, required: false },
    status: { type: String, required: true },
    couponIds: { type: [String], required: false, default: [] },
    discountAmount: { type: Number, required: false, default: 0 },
    orderNumber: { type: String, required: false },
    instructionsSentAt: { type: Date, required: false },
    downloadedAt: { type: Date, required: false },
  },
  { timestamps: true },
);

// Sparse: legacy bookings won't have an orderNumber until the backfill script runs.
bookingSchema.index({ orderNumber: 1 }, { unique: true, sparse: true });

// One row per payment, enforced by the database. The reserve upserts on
// { paymentIntent }, and two requests carrying the same intent — a double
// submit — can both miss the find and both insert. The post-write race check
// can't sort that out either: identical twins tie on both reservedAt and
// paymentIntent, so outranksReservation clears both and neither stands down.
// This makes the second insert fail instead.
//
// Partial rather than plain, because paymentIntent is only a key for rows that
// checkout wrote. Admin-created bookings all share the literal "ADMIN_MANUAL"
// (pages/api/admin/bookings.ts) and legacy rows predate the scheme; neither
// carries reservedAt, so both stay outside the constraint. Note the filter must
// use $exists — partial indexes don't accept $ne, which is what the query side
// uses for the same "is this a reservation" test.
//
// autoIndex is off in production (see db.ts), so run
// scripts/create-booking-indexes.js to build this against a live database.
bookingSchema.index(
  { paymentIntent: 1 },
  { unique: true, partialFilterExpression: { reservedAt: { $exists: true } } },
);

const BookingSchema =
  mongoose.models.Bookings ?? mongoose.model("Bookings", bookingSchema);

const cartSchema = new Schema({
  dressId: { type: String, required: true },
  userId: { type: String, required: true },
  dateBooked: { type: String, required: true },
  size: { type: String, required: true },
  deliveryType: { type: String, required: true },
});

const CartSchema = mongoose.models.Carts ?? mongoose.model("Carts", cartSchema);

const blockOutSchema = new Schema(
  {
    dressId: { type: String, required: true },
    size: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, required: false },
  },
  { timestamps: true },
);

const BlockOutSchema =
  mongoose.models.BlockOuts ?? mongoose.model("BlockOuts", blockOutSchema);

const tryOnBookingSchema = new Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: false },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    price: { type: Number, required: true },
    paymentIntent: { type: String, required: true },
    paymentSuccess: { type: Boolean, required: true, default: false },
    // Set when the row was written by the try-on reserve step, before payment.
    // Its presence is what makes an unpaid row eligible to be swept once it
    // lapses — admin-created rows have no reservedAt and are never touched.
    // A string, not a Date, to match bookingSchema: the cutoff comparisons in
    // findLapsedTryOnReservations are $lt against an ISO string.
    reservedAt: { type: String, required: false },
    status: { type: String, required: true, default: "Booked" },
  },
  { timestamps: true },
);

// One row per slot, paid or not — the database decides who gets a slot, not a
// read followed by a write.
//
// This used to be scoped to paymentSuccess: true, which is exactly what let two
// customers pay for the same appointment: both passed the read, both were
// charged, and the index only refused the second *write* — after both cards had
// been hit. Now the reserve writes an unpaid row before the card is touched, so
// covering every row makes the insert itself the race guard and the loser is
// stopped with nothing charged.
//
// autoIndex is off in production (see db.ts), so run
// scripts/migrate-tryon-slot-index.js to build this against a live database.
tryOnBookingSchema.index({ date: 1, timeSlot: 1 }, { unique: true });

const TryOnBookingSchema =
  mongoose.models.TryOnBookings ??
  mongoose.model("TryOnBookings", tryOnBookingSchema);

const tryOnAvailabilitySchema = new Schema(
  {
    date: { type: String, required: true, unique: true },
    timeSlots: { type: [String], required: true, default: [] },
  },
  { timestamps: true },
);

const TryOnAvailabilitySchema =
  mongoose.models.TryOnAvailabilities ??
  mongoose.model("TryOnAvailabilities", tryOnAvailabilitySchema);

const couponSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      required: function (this: any) {
        return !this.isGlobal;
      },
    },
    // Redemption code required to unlock a global coupon; personal coupons
    // are assigned directly to a userId and don't need one.
    code: {
      type: String,
      uppercase: true,
      trim: true,
      required: function (this: any) {
        return this.isGlobal;
      },
    },
    discountAmount: { type: Number, required: true },
    discountType: {
      type: String,
      enum: Object.values(CouponType),
      required: true,
      default: CouponType.Flat,
    },
    appliesTo: {
      type: String,
      enum: Object.values(CouponScope),
      default: CouponScope.Cart,
    },
    // Global coupons are available to every customer (each may redeem once,
    // tracked in redeemedByUserIds) rather than being owned by a single userId.
    isGlobal: { type: Boolean, required: true, default: false },
    maxRedemptions: {
      type: Number,
      required: function (this: any) {
        return this.isGlobal;
      },
    },
    redeemedByUserIds: {
      type: [mongoose.Schema.ObjectId],
      required: false,
      default: [],
    },
    // Slots held by checkouts that have reserved but not yet paid. A claim is
    // a redemption on loan: it counts against capacity exactly like a real one,
    // so a code can't be spent twice while the first customer is at the card
    // form, but it is handed back if that payment never lands.
    //
    // Claiming is the one thing here that has to be atomic, which is why this
    // is an array on the coupon itself rather than a separate collection —
    // capacity and the claim then live in a single document, so one guarded
    // update can check and take a slot in the same write. See claimCoupon in
    // lib/db/coupon-dao.ts.
    //
    // expiresAt is the reservation's own deadline (lib/utils/reservation.ts),
    // so a claim and the dress hold it accompanies lapse together.
    pendingClaims: {
      type: [
        new Schema(
          {
            // String rather than ObjectId (unlike redeemedByUserIds): a claim
            // is transient bookkeeping, never joined on, and every comparison
            // it takes part in happens inside an aggregation expression where
            // a plain string is one less conversion to get wrong.
            userId: { type: String, required: true },
            paymentIntent: { type: String, required: true },
            expiresAt: { type: String, required: true },
          },
          { _id: false },
        ),
      ],
      required: false,
      default: [],
    },
    startDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    isRedeemed: { type: Boolean, required: true, default: false },
    reason: { type: String, required: false },
  },
  { timestamps: true },
);

couponSchema.index({ code: 1 }, { unique: true, sparse: true });

const CouponSchema =
  mongoose.models.Coupons ?? mongoose.model("Coupons", couponSchema);

const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

const CounterSchema =
  mongoose.models.Counters ?? mongoose.model("Counters", counterSchema);

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, required: true },
    // SHA-256 hash of the emailed token — never the raw token itself.
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index: Mongo auto-deletes each doc once `expiresAt` passes.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetTokenSchema =
  mongoose.models.PasswordResetTokens ??
  mongoose.model("PasswordResetTokens", passwordResetTokenSchema);

export {
  UserSchema,
  BookingSchema,
  CartSchema,
  BlockOutSchema,
  TryOnBookingSchema,
  TryOnAvailabilitySchema,
  CouponSchema,
  CounterSchema,
  PasswordResetTokenSchema,
};
