// src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { getCart, syncCart } from "@/api/cart";
import { useUserContext } from "./UserContext";
import useLocalStorage from "@/hooks/useLocalStorage";
import { CartType } from "../../common/types";

interface CartContextType {
  cartCount: number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  cartCount: 0,
  refreshCart: async () => {},
});

export const useCartContext = () => useContext(CartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { userInfo } = useUserContext();
  const [cartCount, setCartCount] = useState(0);
  const { getItems, clearItems } = useLocalStorage<CartType[]>("localCart");

  const refreshCart = React.useCallback(async () => {
    if (!userInfo?._id) {
      const localCart = getItems();
      setCartCount(localCart ? localCart.length : 0);
      return;
    }

    const cart = await getCart(userInfo?._id)
      .then((res) => res.data)
      .catch((err) => {
        console.error("Error fetching cart:", err);
        return [];
      });

    setCartCount(cart.length);
  }, [userInfo, getItems]);

  // Guests fill `localCart` in the browser (ProductPage). This carries it into
  // their account the moment one exists, which is the other half of letting
  // people shop before they sign in.
  const isSyncing = React.useRef(false);

  useEffect(() => {
    const cartItems = getItems();
    const hasLocalCart = cartItems != null && cartItems.length > 0;

    if (!userInfo?._id || !hasLocalCart) {
      refreshCart();
      return;
    }

    // userInfo can settle more than once on a page load. syncCart is idempotent
    // per item server-side, but there is no reason to send it twice.
    if (isSyncing.current) return;
    isSyncing.current = true;

    // The items were stored with no userId, and syncCart refuses any item whose
    // userId isn't the caller's, so ownership is stamped on here.
    const owned = cartItems.map((item) => ({ ...item, userId: userInfo._id }));

    syncCart(owned)
      // Cleared only once the server has them: a failed sync should leave the
      // guest cart intact to retry, not drop it on the floor.
      .then(() => clearItems())
      .catch(console.error)
      .finally(() => {
        isSyncing.current = false;
        // Runs on failure too, or the badge keeps showing the guest count.
        refreshCart();
      });
  }, [userInfo, getItems, clearItems, refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};
