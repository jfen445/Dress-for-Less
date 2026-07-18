import { NextApiRequest, NextApiResponse } from "next";
import { BookingSchema, UserSchema } from "../../../lib/db/schema";
import { getBookingsByPaymentIntent } from "../../../lib/db/booking-dao";
import OrderReceiptEmail from "@/components/Emails/OrderReceipt";
import { Resend } from "resend";
import { getDress } from "../../../sanity/sanity.query";
import { Booking, OrderReceipt } from "../../../common/types";
import { removeItemFromCartByFields } from "../../../lib/db/cart-dao";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "../../../lib/db/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  if (req.method == "POST") {
    const intent = req.body.intent as string;

    const filter = { paymentIntent: intent, paymentSuccess: { $ne: true } };
    const update = { $set: { paymentSuccess: true } };
    try {
      const result = await BookingSchema.updateMany(filter, update);

      const bookings = await getBookingsByPaymentIntent(intent);
      const booking = bookings[0] as Booking | undefined;

      if (result.modifiedCount === 0) {
        res
          .status(200)
          .json({ message: "No bookings updated", booking });
        return;
      }

      if (booking) {
        for (const item of booking.items) {
          await removeItemFromCartByFields(
            booking.userId,
            item.dressId,
            item.dateBooked,
            item.size,
          );
        }

        await sendEmailConfirmation(booking);
      }

      res.status(200).json({ message: "Update successful", booking });
    } catch (err) {
      res.status(404).json({ message: "Update Error", error: err });
    }
  }
}

export async function sendEmailConfirmation(booking: Booking) {
  const resend = new Resend(process.env.RESEND_API_KEY as string);

  let user: any = null;
  if ((booking as any).user && (booking as any).user.length > 0) {
    user = (booking as any).user[0];
  } else if (booking.userId) {
    user = await UserSchema.findById(booking.userId).lean();
  }

  const orderReceipt: OrderReceipt[] = await Promise.all(
    booking.items.map(async (item) => {
      const dress = (item as any).dress || (await getDress(item.dressId));

      return {
        _id: item._id,
        dressId: item.dressId,
        name: user?.name ?? "",
        dateBooked: item.dateBooked,
        blockedFrom: item.blockedFrom,
        blockedUntil: item.blockedUntil,
        price: item.price,
        address: item.address,
        billingAddress: booking.billingAddress,
        deliveryType: String(item.deliveryType),
        tracking: booking.tracking ?? "",
        isShipped: booking.isShipped ?? false,
        isReturned: booking.isReturned ?? false,
        paymentIntent: booking.paymentIntent,
        size: item.size,
        dressName: dress?.name ?? "",
        dressDescription: dress?.description ?? "",
        dressImage: dress?.images?.[0] ?? "",
        orderNumber: booking.orderNumber,
      };
    }),
  );

  if (!user || !user.email) {
    console.error("No user found for email confirmation");
    return;
  }

  const toEmail = user?.email
    ? [user.email]
    : [process.env.RESEND_EMAIL_ADDRESS as string];

  await resend.emails.send({
    from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
    to: toEmail,
    subject: "Your Dress for Less Booking Confirmation",
    react: OrderReceiptEmail({ orderReceipt }),
  });
}
