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

  useEffect(() => {
    const cartItems = getItems();

    if (userInfo?._id && cartItems && cartItems.length > 0) {
      const updatedCart = cartItems.map((item) => ({ ...item, userId: userInfo._id }));
      syncCart(updatedCart)
        .then(() => clearItems())
        .then(() => refreshCart())
        .catch(console.error);
    } else {
      refreshCart();
    }
  }, [userInfo, getItems, clearItems, refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};
