// src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { getCart } from "@/api/cart";
import { useUserContext } from "./UserContext";

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

  const refreshCart = async () => {
    console.log("Refreshing cart...", userInfo);
    if (!userInfo?._id) {
      setCartCount(0);
      return;
    }

    console.log("HEREEE");
    const cart = await getCart(userInfo?._id)
      .then((res) => res.data)
      .catch((err) => {
        console.error("Error fetching cart:", err);
        return [];
      });

    console.log("Cart items:", cart);
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
