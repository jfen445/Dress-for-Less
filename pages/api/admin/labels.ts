import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";
import { BookingSchema } from "../../../lib/db/schema";
import { getBookingsById } from "../../../lib/db/booking-dao";
import { findUser, findUserById } from "../../../lib/db/user-dao";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { AccountType } from "../../../common/enums/AccountType";
import { createLabel } from "../../../lib/nzpost/parcelLabel";
import { NZPostApiError } from "../../../lib/nzpost/auth";
import { Booking, UserType } from "../../../common/types";

type LabelResult = {
  bookingId: string;
  success: boolean;
  consignmentId?: string;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user.email;
  if (!userEmail) {
    return res.status(401).json({ message: "User email not found in session" });
  }

  const adminUsers = await findUser(userEmail.toString());
  if (adminUsers.length === 0 || adminUsers[0].role !== AccountType.Admin) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const bookingIds = req.body.bookingIds as string[] | undefined;
  if (!bookingIds || bookingIds.length === 0) {
    return res.status(400).json({ message: "bookingIds is required" });
  }

  const results: LabelResult[] = [];

  for (const bookingId of bookingIds) {
    try {
      const booking = (await getBookingsById(bookingId)) as Booking | null;
      if (!booking) {
        results.push({ bookingId, success: false, message: "Booking not found" });
        continue;
      }

      const user = (await findUserById(booking.userId)) as UserType | null;
      if (!user) {
        results.push({ bookingId, success: false, message: "Customer not found" });
        continue;
      }

      const { consignmentId } = await createLabel(booking, user);

      await BookingSchema.findByIdAndUpdate(bookingId, {
        tracking: consignmentId,
      });

      results.push({ bookingId, success: true, consignmentId });
    } catch (err) {
      if (err instanceof NZPostApiError) {
        console.error(
          "NZ Post createLabel failed",
          JSON.stringify(
            { bookingId, status: err.status, responseBody: err.responseBody },
            null,
            2,
          ),
        );
      } else {
        console.error("NZ Post createLabel failed", { bookingId, err });
      }
      const message =
        err instanceof NZPostApiError
          ? "NZ Post rejected the label request"
          : "Failed to create label";
      results.push({ bookingId, success: false, message });
    }
  }

  res.status(200).json({ results });
}
