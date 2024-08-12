import React from "react";
import Stripe from "stripe";
import { CartItemType } from "../../../../common/types";
import { notFound } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import { CheckoutForm } from "./CheckoutForm";
import { ProductContext } from "..";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface IPayment {
  products: CartItemType[];
}

const Payment = async () => {
  const { userInfo } = useUserContext();
  const { products, setProducts } = React.useContext(ProductContext);
  // const [intent, setIntent] = React.useState();

  // const getIntent = async (): Promise<any> => {
  //   if (!userInfo) return;

  //   const intent = await stripe.paymentIntents.create({
  //     amount: parseInt(products[0].price),
  //     currency: "NZD",
  //     metadata: { productId: userInfo._id ?? "" },
  //   });

  //   return intent;
  // };
  if (products == null || !userInfo) return;
  const intent = await stripe.paymentIntents.create({
    amount: parseInt(products[0].price),
    currency: "NZD",
    metadata: { productId: userInfo._id ?? "" },
  });

  // if (paymentIntent.client_secret == null) {
  //   throw Error("Stripe failed to create payment intent");
  // }

  // return <CheckoutForm clientSecret={paymentIntent.client_secret} />;

  return <div>hi</div>;
};
export default Payment;
