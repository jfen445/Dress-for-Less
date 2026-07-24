import { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { auckland } from "../../../lib/utils/timezone";
import { dbConnect } from "../../../lib/db/db";
import { getBookingsByDateRange } from "../../../lib/db/booking-dao";
import { getDress } from "../../../sanity/sanity.query";
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

  // Mon-Thu bookings get their reminder the next day; Fri/Sat/Sun bookings
  // all wait until Monday. So only Mon-Fri cron runs have bookings to chase.
  let startDate: string;
  let endDate: string;

  if (dayOfWeek === 1) {
    startDate = now.subtract(3, "day").format("YYYY-MM-DD");
    endDate = now.subtract(1, "day").format("YYYY-MM-DD");
  } else if (dayOfWeek >= 2 && dayOfWeek <= 5) {
    startDate = now.subtract(1, "day").format("YYYY-MM-DD");
    endDate = startDate;
  } else {
    return res.status(200).json({ message: "No bookings to remind" });
  }

  await dbConnect();

  const bookings = await getBookingsByDateRange(startDate, endDate);

  const reminders = bookings.flatMap((booking) =>
    booking.items
      .filter(
        (item: any) => item.dateBooked >= startDate && item.dateBooked <= endDate,
      )
      .map((item: any) => ({ booking, item })),
  );

  if (reminders.length === 0)
    return res.status(200).json({ message: "No bookings to remind" });

  const resend = new Resend(process.env.RESEND_API_KEY as string);

  const results = await Promise.allSettled(
    reminders.map(async ({ booking, item }) => {
      const dress = await getDress(item.dressId);
      const recipient = booking.user?.[0];
      if (!recipient?.email)
        throw new Error(`No email for booking ${booking._id}`);

      await resend.emails.send({
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
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  const sent = reminders.length - failed;

  if (failed > 0 && sent === 0)
    return res.status(500).json({ message: "Failed to send all emails" });

  if (failed > 0)
    return res.status(207).json({ message: `${sent} sent, ${failed} failed` });

  return res.status(200).json({
    message: `${sent} reminder${sent !== 1 ? "s" : ""} sent successfully`,
  });
}
