import api from "./client";
import { PaymentKind } from "../../common/enums/PaymentKind";

export async function getClientSecret(
  price: string,
  kind: PaymentKind = PaymentKind.Rental,
) {
  return api.post(`/api/payment/intent?price=${price}&kind=${kind}`);
}
