// src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { getCart } from "@/api/cart";
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
  const { getItems } = useLocalStorage<CartType[]>("localCart");

  const refreshCart = async () => {
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
  };

  useEffect(() => {
    refreshCart(); // Only fetch once on mount
  }, [userInfo]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};
