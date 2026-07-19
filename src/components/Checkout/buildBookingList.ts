import { Address, Booking, BookingItem, CartItemType } from "../../../common/types";
import { BookingStatus } from "../../../common/enums/BookingStatus";
import {
  calculateShippingFee,
  hasDeliveryItem,
} from "../../../lib/utils/deliveryRules";

export function buildBooking(
  products: CartItemType[],
  userId: string,
  address: Address | null,
  billingAddress: Address | null,
  instructions: string,
  paymentIntent: string,
): Booking {
  const items: BookingItem[] = products.map((item) => ({
    dressId: item._id,
    dateBooked: item.dateBooked,
    blockedFrom: "",
    blockedUntil: "",
    deliveryType: item.deliveryType,
    address: {
      company: address?.company ?? "",
      address: address?.address ?? "",
      apartment: address?.apartment ?? "",
      suburb: address?.suburb ?? "",
      city: address?.city ?? "",
      country: address?.country ?? "",
      postCode: address?.postCode ?? "",
      nzPostAddressId: address?.nzPostAddressId,
      nzPostDpid: address?.nzPostDpid,
      isRuralDelivery: address?.isRuralDelivery ?? false,
      ruralDeliveryNumber: address?.ruralDeliveryNumber,
    },
    size: item.size,
    price: parseInt(item.price),
    instructions: instructions ?? "",
  }));

  const shippingFee = calculateShippingFee(
    hasDeliveryItem(items),
    address?.isRuralDelivery ?? false,
  );

  return {
    userId,
    items,
    totalPrice: items.reduce((sum, item) => sum + item.price, 0) + shippingFee,
    billingAddress: {
      company: billingAddress?.company ?? "",
      address: billingAddress?.address ?? "",
      apartment: billingAddress?.apartment ?? "",
      suburb: billingAddress?.suburb ?? "",
      city: billingAddress?.city ?? "",
      country: billingAddress?.country ?? "",
      postCode: billingAddress?.postCode ?? "",
    },
    tracking: "",
    isShipped: false,
    isReturned: false,
    paymentIntent,
    status: BookingStatus.NA,
  };
}
