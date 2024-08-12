"use client";

import {
  CardElement,
  Elements,
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import axios from "axios";
import React, { FormEvent } from "react";
import { ProductContext } from "..";
import { getClientSecret } from "@/api/payment";
import { loadStripe } from "@stripe/stripe-js";
import Button from "@/components/Button";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY as string
);

const PaymentForm = () => {
  const { products, setProducts } = React.useContext(ProductContext);
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = React.useState<string>("");

  const sumPrices = React.useCallback(() => {
    return products.reduce((n, { price }) => n + parseInt(price), 0).toFixed(2);
  }, [products]);

  React.useEffect(() => {
    const getSecret = async () => {
      await getClientSecret(sumPrices()).then((data) => {
        console.log(":this is the data", data?.data.clientSecret);
        setClientSecret(data?.data.clientSecret);
      });
    };

    getSecret();
  }, [products, sumPrices]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cardElement = elements?.getElement("card");

    try {
      if (!stripe || !cardElement) return null;
      const { data } = await axios.post("/api/payment", {
        data: { amount: 89 },
      });
      const clientSecret = data;

      await stripe?.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });
    } catch (error) {
      console.log(error);
    }
  };

  console.log("thi sis the secret", clientSecret);
  return (
    <form onSubmit={onSubmit}>
      {/* <CardElement /> */}
      {clientSecret ? (
        <Elements options={{ clientSecret }} stripe={stripePromise}>
          <Form />
        </Elements>
      ) : null}
      <button type="submit">Submit</button>
    </form>
  );
};

export default PaymentForm;

function Form({
  priceInCents,
  productId,
}: {
  priceInCents?: number;
  productId?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const [email, setEmail] = React.useState<string>();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    console.log("hiii", e);
    if (stripe == null || elements == null || email == null) return;

    setIsLoading(true);

    // const orderExists = await userOrderExists(email, productId);

    // if (orderExists) {
    //   setErrorMessage(
    //     "You have already purchased this product. Try downloading it from the My Orders page"
    //   );
    //   setIsLoading(false);
    //   return;
    // }

    stripe
      .confirmPayment({
        elements,
        confirmParams: {
          return_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/dresses`,
        },
      })
      .then(({ error }) => {
        if (error.type === "card_error" || error.type === "validation_error") {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("An unknown error occurred");
        }
      })
      .finally(() => setIsLoading(false));
  }

  async function onSubmit() {
    console.log("hiii");
    if (stripe == null || elements == null || email == null) return;

    setIsLoading(true);

    // const orderExists = await userOrderExists(email, productId);

    // if (orderExists) {
    //   setErrorMessage(
    //     "You have already purchased this product. Try downloading it from the My Orders page"
    //   );
    //   setIsLoading(false);
    //   return;
    // }

    stripe
      .confirmPayment({
        elements,
        confirmParams: {
          return_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/dresses`,
        },
      })
      .then(({ error }) => {
        if (error.type === "card_error" || error.type === "validation_error") {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("An unknown error occurred");
        }
      })
      .finally(() => setIsLoading(false));
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <div className="mt-4">
        <LinkAuthenticationElement onChange={(e) => setEmail(e.value.email)} />
      </div>
      <Button
        onClick={() => onSubmit()}
        className="w-full"
        disabled={stripe == null || elements == null || isLoading}
      >
        button press me
      </Button>
    </form>
  );
}
