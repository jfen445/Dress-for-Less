// import { NextApiRequest, NextApiResponse } from "next";
// import { ErrorMessageProps } from "sanity";

// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY as string);

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   if (req.method === "POST") {
//     try {
//       // Create Checkout Sessions from body params.

//       console.log("keyyyy", process.env.STRIPE_SECRET_KEY);
//       const session = await stripe.checkout.sessions.create({
//         line_items: [
//           {
//             // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
//             price: "pr_1234",
//             quantity: 1,
//           },
//         ],
//         mode: "payment",
//         success_url: `http://localhost:3000/`,
//         cancel_url: `http://localhost:3000/dresses`,
//       });
//       res.redirect(303, session.url);
//     } catch (err: any) {
//       res.status(err.statusCode || 500).json(err.message);
//     }
//   } else {
//     res.setHeader("Allow", "POST");
//     res.status(405).end("Method Not Allowed");
//   }
// }

// import Stripe from "stripe";
// import { NextRequest, NextResponse } from "next/server";
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
// export async function POST(request: NextRequest) {
//   try {
//     // you can implement some basic check here like, is user valid or not
//     const data = await request.json();
//     const priceId = data.priceId;
//     const checkoutSession: Stripe.Checkout.Session =
//       await stripe.checkout.sessions.create({
//         payment_method_types: ["card"],
//         line_items: [
//           {
//             price: priceId,
//             quantity: 1,
//           },
//         ],
//         mode: "payment",
//         success_url: `${process.env.NEXT_BASE_URL}/`,
//         cancel_url: `${process.env.NEXT_BASE_URL}/dresses`,
//         metadata: {
//           priceId,
//         },
//       });
//     return NextResponse.json({ result: checkoutSession, ok: true });
//   } catch (error) {
//     console.log(error);
//     return new NextResponse("Internal Server", { status: 500 });
//   }
// }
import { NextApiRequest, NextApiResponse } from "next";
import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  typescript: true,
  apiVersion: "2024-06-20",
});

// export default async function POST(req: NextRequest) {
//   // const { data } = await req.json();
//   // const { amount } = data;
//   try {
//     // const paymentIntent = await stripe.paymentIntents.create({
//     //   amount: 100,
//     //   currency: "USD",
//     // });

//     return new NextResponse("dA", { status: 200 });
//   } catch (error: any) {
//     return new NextResponse(error, {
//       status: 400,
//     });
//   }
// }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method == "POST") {
    const price = req.query.price as string;
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: parseInt(price),
        currency: "NZD",
      });
      res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      res.status(404).json(err);
    }
  }

  //   return NextResponse.json({ messsage: "Hello World" });
}
