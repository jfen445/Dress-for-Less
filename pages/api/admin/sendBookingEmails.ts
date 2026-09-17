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
import { BookingStatus } from "../../../common/enums/BookingStatus";
import { EmailSendResult } from "../../../common/enums/EmailSendResult";
import BookingInstructionsEmail, {
  getBookingInstructionsSubject,
} from "@/components/Emails/BookingInstructions";

// Increase timeout for batch send out
export const config = { maxDuration: 60 };

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

  // bookings must be packed to send instructions
  const sendable = bookings.filter(
    (booking) => booking.status === BookingStatus.Packed,
  );
  const skipped = bookings.length - sendable.length;

  if (sendable.length === 0)
    return res.status(409).json({
      message: `No emails sent: ${skipped} order${skipped !== 1 ? "s are" : " is"} not packed`,
      sent: 0,
      failed: 0,
      skipped,
    });

  const resend = new Resend(process.env.RESEND_API_KEY as string);

  // Sent one at a time, not in parallel: Resend rate-limits at 2 requests per
  // second, and a rejected send is what stamps instructionsSentAt on a booking
  // nobody was actually emailed.
  const results: EmailSendResult[] = [];

  // Resend message IDs per booking, keyed by booking id — one id per booking,
  // since an order is one email however many dresses it holds.
  const emailIdsByBooking = new Map<string, string[]>();

  // One email per booking, not per item: an order with three dresses gets a
  // single message listing all three, so the customer isn't sent three
  // near-identical instruction emails for one order.
  for (const [i, booking] of sendable.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 550));

    try {
      const recipient = booking.user?.[0];
      if (!recipient?.email)
        throw new Error(`No email for booking ${booking._id}`);

      // One lookup per distinct dress, so two lines of the same dress in an
      // order cost one Sanity call.
      const dressIds: string[] = [
        ...new Set<string>(booking.items.map((item: any) => item.dressId)),
      ];
      const dresses = new Map(
        await Promise.all(
          dressIds.map(async (id) => [id, await getDress(id)] as const),
        ),
      );

      const items = booking.items.map((item: any) => ({
        dressName: dresses.get(item.dressId)?.name ?? "",
        dressImage: dresses.get(item.dressId)?.images?.[0] ?? "",
        size: item.size,
        dateBooked: item.dateBooked,
        endDate: item.endDate,
        deliveryType: item.deliveryType,
      }));

      // Resend resolves with { error } rather than throwing, so an unverified
      // sender domain or a 429 looks identical to a success unless we check.
      const { data, error } = await resend.emails.send({
        from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
        to: [recipient.email],
        subject: getBookingInstructionsSubject(
          items.map((item: { deliveryType: string }) => item.deliveryType),
        ),
        react: BookingInstructionsEmail({
          name: recipient.name ?? "",
          items,
        }),
      });

      if (error) throw new Error(`${error.name}: ${error.message}`);

      // Recorded even if the id is somehow absent, so a send is never dropped
      // from the sent set on account of a missing id.
      emailIdsByBooking.set(booking._id.toString(), data?.id ? [data.id] : []);

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
  const sent = sendable.length - failed;

  // Only the bookings whose email actually sent are stamped — exactly the ones
  // that made it into the map. Written per booking rather than with one
  // updateMany, since each carries its own message id. instructionsSentAt is
  // overwritten to the latest send while the ids accumulate, so a re-send keeps
  // the earlier ones lookupable.
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

  // Counts are returned alongside the message so the caller can pick a toast
  // variant: a partial send reads as success on the wire (2xx) but isn't one.
  const skippedNote = skipped > 0 ? `, ${skipped} skipped (not packed)` : "";

  if (failed > 0 && sent === 0)
    return res.status(500).json({
      message: `Failed to send all emails${skippedNote}`,
      sent,
      failed,
      skipped,
    });

  if (failed > 0 || skipped > 0)
    return res.status(207).json({
      message: `${sent} sent${failed > 0 ? `, ${failed} failed` : ""}${skippedNote}`,
      sent,
      failed,
      skipped,
    });

  return res.status(200).json({
    message: `${sent} email${sent !== 1 ? "s" : ""} sent successfully`,
    sent,
    failed,
    skipped,
  });
}
