import api from "./client";

export async function getClientSecret(price: string) {
  return api.post(`/api/payment/intent?price=${price}`);
}
