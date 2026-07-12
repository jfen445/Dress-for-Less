import api from "./client";

export async function getTakenTryOnSlots(date: string) {
  return api.get(`/api/tryOnBooking?date=${date}`);
}

export async function getAvailableTryOnDates() {
  return api.get(`/api/tryOnAvailability`);
}

export async function createTryOnBooking(payload: {
  date: string;
  timeSlot: string;
  name: string;
  phone: string;
  paymentIntent: string;
}) {
  return api.post(`/api/tryOnBooking`, payload);
}
