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
}) {
  return api.post(`/api/admin/bookings`, data);
}

export async function sendBookingEmails(bookingIds: string[]) {
  return api.post(`/api/admin/sendBookingEmails`, { bookingIds });
}

export async function getAllTryOnBookings() {
  return api.get(`/api/admin/tryOnBookings`);
}

export async function updateTryOnBookingStatus(
  bookingId: string,
  status: string,
) {
  return api.patch(`/api/admin/tryOnBookings?bookingId=${bookingId}`, {
    status,
  });
}
