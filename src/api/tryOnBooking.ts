import api from "./client";

export async function getTakenTryOnSlots(date: string) {
  return api.get(`/api/tryOnBooking?date=${date}`);
}

export async function getAvailableTryOnDates() {
  return api.get(`/api/tryOnAvailability`);
}

// Holds the slot before the card is charged. Failing here means no payment has
// been attempted, which is the point — see the comment in TryOn/PaymentForm.
export async function reserveTryOnBooking(payload: {
  date: string;
  timeSlot: string;
  name: string;
  phone: string;
  paymentIntent: string;
}) {
  return api.post(`/api/tryOnBooking`, payload);
}

export async function confirmTryOnBooking(intent: string) {
  return api.post(`/api/tryOnBooking/confirm`, { intent });
}
