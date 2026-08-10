import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "../../../lib/db/db";
import { BookingSchema } from "../../../lib/db/schema";
import { findUser } from "../../../lib/db/user-dao";
import { reconcileReservation } from "../../../lib/booking/reconcileReservation";

// Hands back a reservation the customer isn't going to use — a declined card, a
// cancelled 3DS challenge, a closed payment form. The sweep would reconcile it
// eventually; this just returns the dress to circulation in seconds rather than
// a quarter of an hour.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  const paymentIntent = req.body.paymentIntent as string;
  if (!paymentIntent) {
    return res.status(400).json({ message: "paymentIntent is required" });
  }

  const booking = await BookingSchema.findOne(
    { paymentIntent },
    "userId paymentSuccess reservedAt",
  );

  // Nothing to release is a success, not an error — the client calls this on
  // failure paths where the reservation may never have been written.
  if (!booking) {
    return res.status(200).json({ message: "Nothing to release" });
  }

  const [sessionUser] = await findUser(session.user.email);
  if (!sessionUser || String(booking.userId) !== String(sessionUser._id)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (booking.paymentSuccess || !booking.reservedAt) {
    return res.status(409).json({ message: "This booking cannot be released" });
  }

  // Cancels the PaymentIntent before removing the row, so the customer's card
  // cannot be charged for a booking that no longer exists. If the payment
  // turns out to have already succeeded, this promotes the reservation into a
  // real booking instead — which is the right answer, even though the client
  // asked to release it.
  const outcome = await reconcileReservation(paymentIntent);

  if (outcome === "promoted") {
    return res
      .status(409)
      .json({ message: "This payment has already succeeded" });
  }

  if (outcome === "unresolved") {
    return res
      .status(502)
      .json({ message: "Could not verify the payment status" });
  }

  return res.status(200).json({ message: "Reservation released" });
}
