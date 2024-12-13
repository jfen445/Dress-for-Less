import { NextApiRequest, NextApiResponse } from "next";
import { BookingSchema } from "../../../lib/db/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (req.method == "POST") {
    const intent = req.query.intent as string;

    const filter = { paymentIntent: intent };
    const update = { paymentSuccess: true };

    try {
      const bookngObj = await BookingSchema.findOneAndUpdate(filter, update);

      res
        .status(200)
        .json({ message: "Update successful", booking: bookngObj });
    } catch (err) {
      res.status(404).json({ message: "Update Error", error: err });
    }
  }

  //   return NextResponse.json({ messsage: "Hello World" });
}
