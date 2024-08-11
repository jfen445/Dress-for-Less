import Checkout from "@/components/Checkout";
import SubscribeComponent from "@/components/Checkout/SubscibeComponent";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const CheckoutPage = () => {
  // const intent = await stripe.paymentIntents.create({
  //   amount: 10,
  //   currency: "NZD",
  //   metadata: { productId: "333" },
  // });

  return (
    <>
      <Checkout />
      {/* <SubscribeComponent
        priceId="price_1PmWpZP04u4yuCC3K2pTkluh"
        price="19"
        description="ee"
      /> */}
    </>
  );
};

export default CheckoutPage;
