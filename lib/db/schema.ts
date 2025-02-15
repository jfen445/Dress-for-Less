import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true },
  password: { type: String, required: false },
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  instagramHandle: { type: String, required: false },
  photo: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "user"],
    required: true,
    default: "user",
  },
});

const UserSchema =
  mongoose.models.AllUsers ?? mongoose.model("AllUsers", userSchema);

const bookingSchema = new Schema(
  {
    dressId: { type: String, required: true },
    userId: { type: mongoose.Schema.ObjectId, required: true },
    dateBooked: { type: String, required: true },
    blockOutPeriod: { type: [String], required: true },
    address: { type: String, required: false },
    city: { type: String, required: false },
    country: { type: String, required: false },
    postCode: { type: String, required: false },
    price: { type: String, required: false },
    deliveryType: { type: String, required: true, default: "delivery" },
    tracking: { type: String, required: false },
    isShipped: { type: Boolean, required: true, default: false },
    isReturned: { type: Boolean, required: true, default: false },
    paymentIntent: { type: String, required: true },
    paymentSuccess: { type: Boolean, required: true, default: false },
    size: { type: String, required: true },
  },
  { timestamps: true }
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

export { UserSchema, BookingSchema, CartSchema };
