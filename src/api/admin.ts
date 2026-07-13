import api from "./client";

export async function getAllBookings() {
  return api.get(`/api/admin/bookings`);
}

export async function getAllAdminUsers() {
  return api.get(`/api/admin/users`);
}

export async function getBlockOuts() {
  return api.get(`/api/admin/blockouts`);
}

export async function createBlockOut(data: {
  dressId: string;
  size: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) {
  return api.post(`/api/admin/blockouts`, data);
}

export async function deleteBlockOut(id: string) {
  return api.delete(`/api/admin/blockouts?id=${id}`);
}

export async function createAdminBooking(data: {
  dressId: string;
  userId?: string;
  newUser?: { email: string; firstName: string; lastName: string };
  dateBooked: string;
  size: string;
  deliveryType: string;
  address?: object;
  billingAddress: object;
  instructions?: string;
}) {
  return api.post(`/api/admin/bookings`, data);
}

export async function sendBookingEmails(bookingIds: string[]) {
  return api.post(`/api/admin/sendBookingEmails`, { bookingIds });
}

export async function getAllTryOnBookings() {
  return api.get(`/api/admin/tryOnBookings`);
}

export async function createAdminTryOnBooking(data: {
  userId?: string;
  newUser?: { email: string; firstName: string; lastName: string };
  phone?: string;
  date: string;
  timeSlot: string;
}) {
  return api.post(`/api/admin/tryOnBookings`, data);
}

export async function updateTryOnBookingStatus(
  bookingId: string,
  status: string,
) {
  return api.patch(`/api/admin/tryOnBookings?bookingId=${bookingId}`, {
    status,
  });
}

export async function getTryOnAvailability() {
  return api.get(`/api/admin/tryOnAvailability`);
}

export async function upsertTryOnAvailability(data: {
  date: string;
  timeSlots: string[];
}) {
  return api.post(`/api/admin/tryOnAvailability`, data);
}

export async function deleteTryOnAvailability(date: string) {
  return api.delete(`/api/admin/tryOnAvailability?date=${date}`);
}

export async function getCoupons() {
  return api.get(`/api/admin/coupons`);
}

export async function createCoupon(data: {
  userId: string;
  discountAmount: number;
  startDate: string;
  durationDays: number;
}) {
  return api.post(`/api/admin/coupons`, data);
}

export async function deleteCoupon(id: string) {
  return api.delete(`/api/admin/coupons?id=${id}`);
}
