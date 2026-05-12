import api from "./client";
import { AxiosError } from "axios";
import { Booking } from "../../common/types";

export async function createBooking(booking: Booking[], paymentIntent: string) {
  try {
    const response = await api.post(
      `/api/booking`,
      { booking, paymentIntent },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}

export async function confirmBooking(intent: string) {
  try {
    const response = await api.post(
      `/api/payment/paymentConfirm`,
      { intent: intent },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}

export async function getAllBookingsByDress(dressId: string) {
  try {
    const response = await api.request({
      url: `/api/booking?dressId=${dressId}`,
      method: "GET",
    });

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}

export async function updateBooking(bookingId: string, bookingObj: any) {
  try {
    const response = await api.patch(
      `/api/booking?bookingId=${bookingId}`,
      { bookingObj },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}

export async function getAllBookingsByUserId(userId: string) {
  try {
    const response = await api.request({
      url: `/api/history?userId=${userId}`,
      method: "GET",
    });

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}

export async function checkValidBooking(booking: Booking[]) {
  try {
    await api.post(`/api/validateBooking`, {
      booking,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}
