import Checkout from "@/components/Checkout";
import Seo from "@/components/Seo";
import Stripe from "stripe";

const CheckoutPage = () => {
  // const intent = await stripe.paymentIntents.create({
  //   amount: 10,
  //   currency: "NZD",
  //   metadata: { productId: "333" },
  // });

  return (
    <>
      <Seo
        title="Checkout | Dress for Less"
        description="Complete your dress rental booking."
        path="/checkout"
        noindex
      />
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
