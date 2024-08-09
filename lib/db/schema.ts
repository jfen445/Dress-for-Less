import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true },
  password: { type: String, required: false },
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  instagramHandle: { type: String, required: false },
});

const UserSchema =
  mongoose.models.AllUsers ?? mongoose.model("AllUsers", userSchema);

export { UserSchema };

const bookingSchema = new Schema({
  dress: { type: String, required: true },
  datesBooked: { type: [String], required: true },
});

const BookingSchema =
  mongoose.models.AllUsers ?? mongoose.model("Bookings", bookingSchema);

export { BookingSchema };
