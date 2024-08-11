import axios, { AxiosError } from "axios";
import { CartType } from "../../common/types";

export async function addToCart(cartItem: CartType) {
  try {
    const response = await axios.post(
      "/api/cart",
      { cartItem },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response;
  } catch (error) {
    // throw error;
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}

export async function getCart(userId: string) {
  try {
    const response = await axios.request({
      url: `/api/cart?userId=${userId}`,
      method: "GET",
    });

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}

export async function removeFromCart(cartItemId: string) {
  try {
    const response = await axios.request({
      url: `/api/cart?cartItemId=${cartItemId}`,
      method: "DELETE",
    });

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}
