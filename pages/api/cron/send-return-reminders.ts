import { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { Resend } from "resend";
import { auckland } from "../../../lib/utils/timezone";
import { dbConnect } from "../../../lib/db/db";
import { BookingSchema } from "../../../lib/db/schema";
import { getBookingsByDateRange } from "../../../lib/db/booking-dao";
import { getDress } from "../../../sanity/sanity.query";
import { EmailSendResult } from "../../../common/enums/EmailSendResult";
import { DeliveryType } from "../../../common/enums/DeliveryType";
import ReturnReminderEmail, {
  getReturnReminderSubject,
} from "@/components/Emails/ReturnReminder";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET)
    return res.status(401).json({ error: "Unauthorized" });

  const now = auckland.now();
  const dayOfWeek = now.day(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const yesterday = now.subtract(1, "day").format("YYYY-MM-DD");

  // send pick up reminders daily
  const pickupWindow = { startDate: yesterday, endDate: yesterday };

  // Delivery returns go through NZ Post, which is shut weekends: Mon-Thu
  // bookings get their reminder the next day, Fri/Sat/Sun bookings all wait
  // until Monday, and there's nothing to chase on Saturday/Sunday itself.
  const deliveryWindow =
    dayOfWeek === 1
      ? {
          startDate: now.subtract(3, "day").format("YYYY-MM-DD"),
          endDate: yesterday,
        }
      : dayOfWeek >= 2 && dayOfWeek <= 5
        ? { startDate: yesterday, endDate: yesterday }
        : null;

  const queryStart = deliveryWindow
    ? deliveryWindow.startDate
    : pickupWindow.startDate;

  await dbConnect();

  const bookings = await getBookingsByDateRange(queryStart, yesterday);

  const isInWindow = (
    dateBooked: string,
    window: { startDate: string; endDate: string } | null,
  ) =>
    window !== null &&
    dateBooked >= window.startDate &&
    dateBooked <= window.endDate;

  const reminders = bookings.flatMap((booking) =>
    booking.items
      .filter((item: any) =>
        isInWindow(
          item.dateBooked,
          item.deliveryType === DeliveryType.Pickup
            ? pickupWindow
            : deliveryWindow,
        ),
      )
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
