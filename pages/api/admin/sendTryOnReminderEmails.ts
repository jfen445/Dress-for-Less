import { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "../../../lib/db/db";
import { findUser } from "../../../lib/db/user-dao";
import { TryOnBookingSchema } from "../../../lib/db/schema";
import { AccountType } from "../../../common/enums/AccountType";
import { EmailSendResult } from "../../../common/enums/EmailSendResult";
import TryOnReminderEmail, {
  getTryOnReminderSubject,
} from "@/components/Emails/TryOnReminder";

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

  const bookings = await TryOnBookingSchema.find({
    _id: { $in: bookingIds },
  });

  const resend = new Resend(process.env.RESEND_API_KEY as string);

  // Sent one at a time, not in parallel, to stay under Resend's 2 requests per
  // second limit — a 429 comes back as a resolved { error }, not a throw.
  const results: EmailSendResult[] = [];

  // Resend message IDs, one per reminder, so a reminder can be looked up later
  // to see whether it was delivered or bounced. Same field the reminder cron
  // writes to — both send the same email to the same row.
  const reminderUpdates: { bookingId: any; emailId: string }[] = [];

  for (const [i, booking] of bookings.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 550));

    try {
      if (!booking.email)
        throw new Error(`No email for booking ${booking._id}`);

      const { data, error } = await resend.emails.send({
        from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
        to: [booking.email],
        subject: getTryOnReminderSubject(),
        react: TryOnReminderEmail({
          name: booking.name ?? "",
          date: booking.date,
          timeSlot: booking.timeSlot,
        }),
      });

      if (error) throw new Error(`${error.name}: ${error.message}`);

      if (data?.id)
        reminderUpdates.push({ bookingId: booking._id, emailId: data.id });

      results.push(EmailSendResult.Sent);
    } catch (err) {
      console.error(
        `Failed to send try-on reminder for booking ${booking._id}:`,
        err,
      );
      results.push(EmailSendResult.Failed);
    }
  }

  const failed = results.filter(
    (result) => result === EmailSendResult.Failed,
  ).length;
  const sent = bookings.length - failed;

  // Recorded, not acted on: the admin picks which try-ons to remind, so
  // nothing here filters on these ids. They accumulate, so a customer
  // reminded twice shows two ids rather than the second overwriting the first.
  if (reminderUpdates.length > 0) {
    await TryOnBookingSchema.bulkWrite(
      reminderUpdates.map(({ bookingId, emailId }) => ({
        updateOne: {
          filter: { _id: bookingId },
          update: { $push: { reminderEmailIds: emailId } },
        },
      })),
    );
  }

  if (failed > 0 && sent === 0)
    return res.status(500).json({ message: "Failed to send all emails" });

  if (failed > 0)
    return res.status(207).json({ message: `${sent} sent, ${failed} failed` });

  return res.status(200).json({
    message: `${sent} email${sent !== 1 ? "s" : ""} sent successfully`,
  });
}
