import api from "./client";
import { AxiosError } from "axios";

export async function getAllBookings() {
  try {
    const response = await api.request({
      url: `/api/admin/bookings`,
      method: "GET",
    });

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}
