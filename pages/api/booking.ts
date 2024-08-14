import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../lib/db/db";
import { BookingSchema } from "../../lib/db/schema";
import { IBooking } from "../../common/interfaces/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  if (req.method == "POST") {
    console.log("bookig item", req.body.address);
    let booking: IBooking = {
      dressId: req.body.dressId,
      userId: req.body.userId,
      dateBooked: req.body.dateBooked,
      blockOutPeriod: req.body.blockOutPeriod,
      address: req.body.address,
      price: req.body.price,
      city: req.body.city,
      country: req.body.country,
      postCode: req.body.postCode,
      deliveryType: req.body.deliveryType,
      tracking: req.body.tracking,
      isShipped: req.body.isShipped,
      isReturned: req.body.isReturned,
      paymentIntent: req.body.paymentIntent,
      paymentSuccess: false,
    };

    const filter = {
      userId: req.body.userId,
      dressId: req.body.dressId,
    };
    const options = { upsert: true };

    await BookingSchema.updateOne(filter, booking, options);

    res.status(200).json({ message: "Booking successful", booking: booking });
  }

  res.status(404).json({ message: "Account created" });
  //   return NextResponse.json({ messsage: "Hello World" });
}
