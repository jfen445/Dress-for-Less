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
import { EmailSendResult } from "../../../common/enums/EmailSendResult";
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

  const recipients = bookings.flatMap((booking) =>
    booking.items.map((item: any) => ({ booking, item })),
  );

  // Sent one at a time, not in parallel: Resend rate-limits at 2 requests per
  // second, and a rejected send is what stamps instructionsSentAt on a booking
  // nobody was actually emailed.
  const results: EmailSendResult[] = [];

  // Resend message IDs per booking, keyed by booking id. A booking appears here
  // as soon as one of its items sends, which is the same "at least one item"
  // rule that decides whether it gets stamped.
  const emailIdsByBooking = new Map<string, string[]>();

  for (const [i, { booking, item }] of recipients.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 550));

    try {
      const dress = await getDress(item.dressId);
      const recipient = booking.user?.[0];
      if (!recipient?.email)
        throw new Error(`No email for booking ${booking._id}`);

      // Resend resolves with { error } rather than throwing, so an unverified
      // sender domain or a 429 looks identical to a success unless we check.
      const { data, error } = await resend.emails.send({
        from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
        to: [recipient.email],
        subject: getBookingInstructionsSubject(item.deliveryType),
        react: BookingInstructionsEmail({
          name: recipient.name ?? "",
          dressName: dress?.name ?? "",
          dressImage: dress?.images?.[0] ?? "",
          size: item.size,
          dateBooked: item.dateBooked,
          deliveryType: item.deliveryType,
          address: item.address,
        }),
      });

      if (error) throw new Error(`${error.name}: ${error.message}`);

      const bookingId = booking._id.toString();
      const emailIds = emailIdsByBooking.get(bookingId) ?? [];
      // Recorded even if the id is somehow absent, so a send is never dropped
      // from the sent set on account of a missing id.
      if (data?.id) emailIds.push(data.id);
      emailIdsByBooking.set(bookingId, emailIds);

      results.push(EmailSendResult.Sent);
    } catch (err) {
      console.error(
        `Failed to send booking instructions for booking ${booking._id}:`,
        err,
      );
      results.push(EmailSendResult.Failed);
    }
  }

  const failed = results.filter(
    (result) => result === EmailSendResult.Failed,
  ).length;
  const sent = recipients.length - failed;

  // A booking counts as "emailed" if at least one of its items sent
  // successfully — which is exactly the bookings that made it into the map.
  // Written per booking rather than with one updateMany, since each carries
  // its own message ids. instructionsSentAt is overwritten to the latest send
  // while the ids accumulate, so a re-send keeps the earlier ones lookupable.
  const sentBookingIds = [...emailIdsByBooking.keys()];

  if (sentBookingIds.length > 0) {
    const sentAt = new Date();

    await BookingSchema.bulkWrite(
      sentBookingIds.map((bookingId) => ({
        updateOne: {
          // Cast explicitly: a string _id that silently failed to match would
          // stamp nothing at all and still report every email as sent.
          filter: { _id: new mongoose.Types.ObjectId(bookingId) },
          update: {
            $set: { instructionsSentAt: sentAt },
            $push: {
              instructionsEmailIds: {
                $each: emailIdsByBooking.get(bookingId) ?? [],
              },
            },
          },
        },
      })),
    );
  }

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
