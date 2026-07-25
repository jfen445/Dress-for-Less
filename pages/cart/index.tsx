import Cart from "@/components/Cart";
import Seo from "@/components/Seo";

const CartPage = () => {
  return (
    <>
      <Seo
        title="Your Cart | Dress for Less"
        description="Review the dresses in your cart."
        path="/cart"
        noindex
      />
      <Cart />
    </>
  );
};

export default CartPage;
