import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true },
  password: { type: String, required: false },
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  instagramHandle: { type: String, required: false },
  photo: { type: String, required: true },
});

const UserSchema =
  mongoose.models.AllUsers ?? mongoose.model("AllUsers", userSchema);

const bookingSchema = new Schema({
  dressId: { type: String, required: true },
  userId: { type: String, required: true },
  dateBooked: { type: String, required: true },
  blockOutPeriod: { type: [String], required: true },
  address: { type: String, required: false },
  city: { type: String, required: false },
  country: { type: String, required: false },
  postCode: { type: String, required: false },
  deliveryType: { type: String, required: true, default: "delivery" },
  tracking: { type: String, required: false },
  isShipped: { type: Boolean, required: true, default: false },
  isReturned: { type: Boolean, required: true, default: false },
});

const BookingSchema =
  mongoose.models.Bookings ?? mongoose.model("Bookings", bookingSchema);

const cartSchema = new Schema({
  dressId: { type: String, required: true },
  userId: { type: String, required: true },
  dateBooked: { type: String, required: true },
});

const CartSchema = mongoose.models.Cart ?? mongoose.model("Cart", cartSchema);

export { UserSchema, BookingSchema, CartSchema };
