import api from "./client";
import { Booking } from "../../common/types";

// Reserves the dress and the coupon slot. Must be called BEFORE the card is
// charged: a failure here is how checkout avoids taking money for an order it
// can't fulfil.
export async function reserveBooking(
  booking: Booking,
  paymentIntent: string,
  couponIds?: string[],
) {
  return api.post(`/api/booking`, { booking, paymentIntent, couponIds });
}

export async function releaseReservation(paymentIntent: string) {
  return api.post(`/api/booking/release`, { paymentIntent });
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

export async function deleteBooking(bookingId: string) {
  return api.delete(`/api/booking?bookingId=${bookingId}`);
}

export async function getAllBookingsByUserId(userId: string) {
  return api.get(`/api/history?userId=${userId}`);
}

export async function getBlockOutsByDress(dressId: string) {
  return api.get(`/api/blockouts?dressId=${dressId}`);
}
