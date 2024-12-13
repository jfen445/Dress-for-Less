import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { authOptions } from "../auth/[...nextauth]";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  typescript: true,
  apiVersion: "2024-06-20",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method == "POST") {
    const price = req.query.price as string;
    console.log("whatttt", price);
    if (parseInt(price) < 50) {
      res.status(404).json("Price is too low");
    }
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: parseInt(price),
        currency: "NZD",
      });
      res
        .status(200)
        .json({ clientSecret: paymentIntent.client_secret, price: price });
    } catch (err) {
      console.log("error", err);
      res.status(404).json(err);
    }
  }

  //   return NextResponse.json({ messsage: "Hello World" });
}
