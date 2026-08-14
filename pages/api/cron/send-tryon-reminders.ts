import { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { auckland } from "../../../lib/utils/timezone";
import { dbConnect } from "../../../lib/db/db";
import { TryOnBookingSchema } from "../../../lib/db/schema";
import { TryOnStatus } from "../../../common/enums/TryOnStatus";
import { EmailSendResult } from "../../../common/enums/EmailSendResult";
import TryOnReminderEmail, {
  getTryOnReminderSubject,
} from "@/components/Emails/TryOnReminder";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET)
    return res.status(401).json({ error: "Unauthorized" });

  await dbConnect();

  const tomorrow = auckland.now().add(1, "day").format("YYYY-MM-DD");

  const bookings = await TryOnBookingSchema.find({
    date: tomorrow,
    paymentSuccess: true,
    status: TryOnStatus.Booked,
  });

  if (bookings.length === 0)
    return res.status(200).json({ message: "No try-ons to remind" });

  const resend = new Resend(process.env.RESEND_API_KEY as string);

  // Sent one at a time, not in parallel, to stay under Resend's 2 requests per
  // second limit — a 429 comes back as a resolved { error }, not a throw.
  const results: EmailSendResult[] = [];

  // Resend message IDs, one per reminder, so a reminder can be looked up later
  // to see whether it was delivered or bounced. No local timestamp alongside
  // them: resend.emails.get(id) already reports created_at.
  const reminderUpdates: { bookingId: any; emailId: string }[] = [];

  for (const [i, booking] of bookings.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 550));

    try {
      if (!booking.email) throw new Error(`No email for booking ${booking._id}`);

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

  // Recorded, not acted on: nothing filters on these ids, so the cron still
  // decides what to send from the date window alone. Shared with the admin
  // send button, which writes to the same field.
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
    message: `${sent} reminder${sent !== 1 ? "s" : ""} sent successfully`,
  });
}
