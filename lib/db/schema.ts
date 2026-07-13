import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true },
  password: { type: String, required: false },
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

const bookingSchema = new Schema(
  {
    dressId: { type: String, required: true },
    userId: { type: mongoose.Schema.ObjectId, required: true },
    dateBooked: { type: String, required: true },
    blockOutPeriod: { type: [String], required: true },
    address: { type: addressSchema, required: false },
    billingAddress: { type: billingAddressSchema, required: false },
    deliveryType: { type: String, required: true, default: "delivery" },
    tracking: { type: String, required: false },
    isShipped: { type: Boolean, required: true, default: false },
    isReturned: { type: Boolean, required: true, default: false },
    paymentIntent: { type: String, required: true },
    paymentSuccess: { type: Boolean, required: true, default: false },
    size: { type: String, required: true },
    price: { type: Number, required: true },
    status: { type: String, required: true },
    couponIds: { type: [String], required: false, default: [] },
    discountAmount: { type: Number, required: false, default: 0 },
    instructions: { type: String, required: false },
  },
  { timestamps: true },
);

const BookingSchema =
  mongoose.models.Bookings ?? mongoose.model("Bookings", bookingSchema);

const cartSchema = new Schema({
  dressId: { type: String, required: true },
  userId: { type: String, required: true },
  dateBooked: { type: String, required: true },
  size: { type: String, required: true },
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
    status: { type: String, required: true, default: "Booked" },
  },
  { timestamps: true },
);

tryOnBookingSchema.index(
  { date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { paymentSuccess: true } },
);

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
    userId: { type: mongoose.Schema.ObjectId, required: true },
    discountAmount: { type: Number, required: true },
    startDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    isRedeemed: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

const CouponSchema =
  mongoose.models.Coupons ?? mongoose.model("Coupons", couponSchema);

export {
  UserSchema,
  BookingSchema,
  CartSchema,
  BlockOutSchema,
  TryOnBookingSchema,
  TryOnAvailabilitySchema,
  CouponSchema,
};
