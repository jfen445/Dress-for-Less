import { NextApiRequest, NextApiResponse } from "next";
import { BookingSchema, UserSchema } from "../../../lib/db/schema";
import { getBookingsByPaymentIntent } from "../../../lib/db/booking-dao";
import OrderReceiptEmail from "@/components/Emails/OrderReceipt";
import { Resend } from "resend";
import { getDress } from "../../../sanity/sanity.query";
import { Booking, OrderReceipt, User } from "../../../common/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method == "POST") {
    const intent = req.body.intent as string;

    const filter = { paymentIntent: intent };
    const update = { paymentSuccess: true };
    try {
      await BookingSchema.updateMany(filter, update);
      const bookings = await getBookingsByPaymentIntent(intent);
      sendEmailConfirmation(bookings);

      res.status(200).json({ message: "Update successful", booking: bookings });
    } catch (err) {
      res.status(404).json({ message: "Update Error", error: err });
    }
  }
}

// TODO: Implement email confirmation functionality
async function sendEmailConfirmation(bookings: Booking[]) {
  const resend = new Resend(process.env.RESEND_API_KEY as string);

  // Ensure we have dress data (booking may not include populated dress)
  // Build an array of OrderReceipt objects from bookings
  const orderReceipt: OrderReceipt[] = await Promise.all(
    bookings.map(async (booking) => {
      const dress = (booking as any).dress || (await getDress(booking.dressId));

      let user: any = null;
      if ((booking as any).user && (booking as any).user.length > 0) {
        user = (booking as any).user[0];
      } else if (booking.userId) {
        user = await UserSchema.findById(booking.userId).lean();
      }

      return {
        _id: booking._id,
        dressId: booking.dressId,
        name: user?.name ?? "",
        dateBooked: booking.dateBooked,
        blockOutPeriod: booking.blockOutPeriod,
        price: booking.price,
        address: booking.address,
        billingAddress: booking.billingAddress,
        deliveryType: String(booking.deliveryType),
        tracking: booking.tracking ?? "",
        isShipped: booking.isShipped ?? false,
        isReturned: booking.isReturned ?? false,
        paymentIntent: booking.paymentIntent,
        size: booking.size,
        dressName: dress?.name ?? "",
        dressDescription: dress?.description ?? "",
        dressImage: dress?.images?.[0] ?? "",
      };
    })
  );

  // Determine recipient: try first booking's user email, fallback to configured address
  const firstUser: User | null =
    (bookings[0] as any).user?.[0] || (bookings[0] as any).userId
      ? await UserSchema.findById((bookings[0] as any).userId).lean()
      : null;

  if (!firstUser || !firstUser.email) {
    console.error("No user found for email confirmation");
    return;
  }

  const toEmail = firstUser?.email
    ? [firstUser.email]
    : [process.env.RESEND_EMAIL_ADDRESS as string];

  await resend.emails.send({
    from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
    to: toEmail,
    subject: "Your Dress for Less Booking Confirmation",
    react: OrderReceiptEmail({ orderReceipt }),
  });
}
