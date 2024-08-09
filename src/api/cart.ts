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
    console.log(";errororroroororo", error);
    const err = error as AxiosError;
    return err.response;
  }
}
