import api from "./client";
import { AxiosError } from "axios";

export async function getClientSecret(price: string) {
  try {
    const response = await api.post(`/api/payment/intent?price=${price}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (error) {
    // throw error;
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}
