import { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { Resend } from "resend";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "../../../lib/db/db";
import { findUser } from "../../../lib/db/user-dao";
import { BookingSchema } from "../../../lib/db/schema";
import { getDress } from "../../../sanity/sanity.query";
import { AccountType } from "../../../common/enums/AccountType";
import BookingInstructionsEmail, {
  getBookingInstructionsSubject,
} from "@/components/Emails/BookingInstructions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const userEmail = session.user.email;
  if (!userEmail)
    return res.status(401).json({ message: "User email not found in session" });

  const adminUser = await findUser(userEmail.toString());
  if (adminUser.length === 0 || adminUser[0].role !== AccountType.Admin)
    return res.status(403).json({ message: "Forbidden: Admins only" });

  const { bookingIds } = req.body as { bookingIds: string[] };
  if (!bookingIds?.length)
    return res.status(400).json({ message: "No booking IDs provided" });

  const objectIds = bookingIds.map((id) => new mongoose.Types.ObjectId(id));

  const bookings = await BookingSchema.aggregate([
    { $match: { _id: { $in: objectIds } } },
    {
      $lookup: {
        from: "allusers",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
  ]);

  const resend = new Resend(process.env.RESEND_API_KEY as string);

  const results = await Promise.allSettled(
    bookings.map(async (booking) => {
      const dress = await getDress(booking.dressId);
      const recipient = booking.user?.[0];
      if (!recipient?.email) throw new Error(`No email for booking ${booking._id}`);

      await resend.emails.send({
        from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
        to: [recipient.email],
        subject: getBookingInstructionsSubject(booking.deliveryType),
        react: BookingInstructionsEmail({
          name: recipient.name ?? "",
          dressName: dress?.name ?? "",
          dressImage: dress?.images?.[0] ?? "",
          size: booking.size,
          dateBooked: booking.dateBooked,
          deliveryType: booking.deliveryType,
          address: booking.address,
        }),
      });
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  const sent = bookings.length - failed;

  if (failed > 0 && sent === 0)
    return res.status(500).json({ message: "Failed to send all emails" });

  if (failed > 0)
    return res
      .status(207)
      .json({ message: `${sent} sent, ${failed} failed` });

  return res
    .status(200)
    .json({ message: `${sent} email${sent !== 1 ? "s" : ""} sent successfully` });
}
