import { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { Resend } from "resend";
import { auckland } from "../../../lib/utils/timezone";
import { dbConnect } from "../../../lib/db/db";
import { BookingSchema } from "../../../lib/db/schema";
import { getBookingsByDateRange } from "../../../lib/db/booking-dao";
import { getDress } from "../../../sanity/sanity.query";
import { EmailSendResult } from "../../../common/enums/EmailSendResult";
import ReturnReminderEmail, {
  getReturnReminderSubject,
} from "@/components/Emails/ReturnReminder";

export const config = { maxDuration: 300 };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET)
    return res.status(401).json({ error: "Unauthorized" });

  const today = auckland.now().format("YYYY-MM-DD");

  // One day wide, and the same window for both delivery methods. The weekday
  // branching this replaces existed only because the return date was not
  // stored: Friday, Saturday and Sunday deliveries all fall due on the Monday,
  // which is now worked out when the booking is written. Catching up after a
  // missed run would be a change to these two dates and nothing else.
  const dueWindow = { startDate: today, endDate: today };

  await dbConnect();

  const bookings = await getBookingsByDateRange(
    dueWindow.startDate,
    dueWindow.endDate,
  );

  const isInWindow = (
    returnDate: string | undefined,
    window: { startDate: string; endDate: string },
  ) =>
    returnDate != null &&
    returnDate >= window.startDate &&
    returnDate <= window.endDate;

  // The query matches a booking on any one of its items, so a multi-line
  // booking with one dress due today still has to be narrowed to that dress.
  const reminders = bookings.flatMap((booking) =>
    booking.items
      .filter((item: any) => isInWindow(item.returnDate, dueWindow))
      .map((item: any) => ({ booking, item })),
  );

  if (reminders.length === 0)
    return res.status(200).json({ message: "No bookings to remind" });

  const resend = new Resend(process.env.RESEND_API_KEY as string);

  // Sent one at a time, not in parallel, to stay under Resend's 2 requests per
  // second limit — a 429 comes back as a resolved { error }, not a throw.
  const results: EmailSendResult[] = [];

  // Resend message IDs per booking, so a reminder can be looked up later to
  // see whether it was delivered or bounced. No local timestamp to go with
  // them: resend.emails.get(id) already reports created_at.
  const emailIdsByBooking = new Map<string, string[]>();

  for (const [i, { booking, item }] of reminders.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 550));

    try {
      const dress = await getDress(item.dressId);
      const recipient = booking.user?.[0];
      if (!recipient?.email)
        throw new Error(`No email for booking ${booking._id}`);

      const { data, error } = await resend.emails.send({
        from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
        to: [recipient.email],
        subject: getReturnReminderSubject(item.deliveryType),
        react: ReturnReminderEmail({
          name: recipient.name ?? "",
          dressName: dress?.name ?? "",
          dressImage: dress?.images?.[0] ?? "",
          size: item.size,
          dateBooked: item.dateBooked,
          returnDate: item.returnDate,
          deliveryType: item.deliveryType,
        }),
      });

      if (error) throw new Error(`${error.name}: ${error.message}`);

      if (data?.id) {
        const bookingId = booking._id.toString();
        emailIdsByBooking.set(bookingId, [
          ...(emailIdsByBooking.get(bookingId) ?? []),
          data.id,
        ]);
      }

      results.push(EmailSendResult.Sent);
    } catch (err) {
      console.error(
        `Failed to send return reminder for booking ${booking._id}:`,
        err,
      );
      results.push(EmailSendResult.Failed);
    }
  }

  const failed = results.filter(
    (result) => result === EmailSendResult.Failed,
  ).length;
  const sent = reminders.length - failed;

  // Recorded, not acted on: nothing here filters on these ids, so the cron
  // still decides what to send purely from the date window. They accumulate,
  // which means a booking reminded twice shows two ids rather than hiding it.
  if (emailIdsByBooking.size > 0) {
    await BookingSchema.bulkWrite(
      [...emailIdsByBooking].map(([bookingId, emailIds]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(bookingId) },
          update: {
            $push: { returnReminderEmailIds: { $each: emailIds } },
          },
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
