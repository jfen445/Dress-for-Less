import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  typescript: true,
  apiVersion: "2024-06-20",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method == "POST") {
    const amount = parseInt(req.query.price as string, 10);
    if (isNaN(amount) || amount < 50) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "NZD",
      });
      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        price: String(amount),
      });
    } catch (err) {
      console.error("payment intent error", err);
      res.status(500).json({ message: "Unable to create payment intent" });
    }
  }

  //   return NextResponse.json({ messsage: "Hello World" });
}
