import { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
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
  console.log("CRON_SECRET set:", !!process.env.CRON_SECRET);
  console.log("Token set:", !!token);
  console.log("Token set:", process.env.CRON_SECRET, token);
  if (!token || token !== process.env.CRON_SECRET)
    return res.status(401).json({ error: "Unauthorized" });

  await dbConnect();

  const today = new Date();
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - 1);
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - 7);

  const toDateString = (d: Date) => d.toISOString().split("T")[0];
  const startDate = toDateString(lastMonday);
  const endDate = toDateString(lastSunday);

  const bookings = await getBookingsByDateRange(startDate, endDate);

  if (bookings.length === 0)
    return res.status(200).json({ message: "No bookings to remind" });

  const resend = new Resend(process.env.RESEND_API_KEY as string);

  const results = await Promise.allSettled(
    bookings.map(async (booking) => {
      const dress = await getDress(booking.dressId);
      const recipient = booking.user?.[0];
      if (!recipient?.email)
        throw new Error(`No email for booking ${booking._id}`);

      await resend.emails.send({
        from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
        to: [recipient.email],
        subject: getReturnReminderSubject(booking.deliveryType),
        react: ReturnReminderEmail({
          name: recipient.name ?? "",
          dressName: dress?.name ?? "",
          dressImage: dress?.images?.[0] ?? "",
          size: booking.size,
          dateBooked: booking.dateBooked,
          deliveryType: booking.deliveryType,
        }),
      });
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  const sent = bookings.length - failed;

  if (failed > 0 && sent === 0)
    return res.status(500).json({ message: "Failed to send all emails" });

  if (failed > 0)
    return res.status(207).json({ message: `${sent} sent, ${failed} failed` });

  return res.status(200).json({
    message: `${sent} reminder${sent !== 1 ? "s" : ""} sent successfully`,
  });
}
