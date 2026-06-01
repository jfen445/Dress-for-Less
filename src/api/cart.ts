import api from "./client";
import { CartType } from "../../common/types";

export async function addToCart(cartItem: CartType) {
  return api.post(`/api/cart`, { cartItem });
}

export async function getCart(userId: string) {
  return api.get(`/api/cart?userId=${userId}`);
}

export async function removeFromCart(cartItemId: string) {
  return api.delete(`/api/cart?cartItemId=${cartItemId}`);
}

export async function syncCart(cart: CartType[]) {
  return api.post(`/api/syncCart`, { cart });
}
