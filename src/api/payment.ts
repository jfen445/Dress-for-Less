import axios, { AxiosError } from "axios";

export async function getClientSecret(price: string) {
  try {
    const response = await axios.post(`/api/payment?price=200000`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (error) {
    // throw error;
    const err = error as AxiosError;
    console.log("?????????????", err);
    // throw new Error((err?.response?.data as any).message);
  }
}
