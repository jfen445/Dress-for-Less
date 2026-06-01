import api from "./client";
import { Booking } from "../../common/types";

export async function createBooking(booking: Booking[], paymentIntent: string) {
  return api.post(`/api/booking`, { booking, paymentIntent });
}

export async function confirmBooking(intent: string) {
  return api.post(`/api/payment/paymentConfirm`, { intent });
}

export async function getAllBookingsByDress(dressId: string) {
  return api.get(`/api/booking?dressId=${dressId}`);
}

export async function updateBooking(bookingId: string, bookingObj: any) {
  return api.patch(`/api/booking?bookingId=${bookingId}`, { bookingObj });
}

export async function getAllBookingsByUserId(userId: string) {
  return api.get(`/api/history?userId=${userId}`);
}

export async function getBlockOutsByDress(dressId: string) {
  return api.get(`/api/blockouts?dressId=${dressId}`);
}

export async function checkValidBooking(booking: Booking[]) {
  return api.post(`/api/validateBooking`, { booking });
}
