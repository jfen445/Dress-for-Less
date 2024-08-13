import axios, { AxiosError } from "axios";
import { Booking } from "../../common/types";

export async function createBooking(booking: Booking) {
  try {
    const response = await axios.post(`/api/booking`, booking, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}
