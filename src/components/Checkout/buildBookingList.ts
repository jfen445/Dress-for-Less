import { Address, Booking, CartItemType } from "../../../common/types";
import { BookingStatus } from "../../../common/enums/BookingStatus";
import { DeliveryType } from "../../../common/enums/DeliveryType";

export function buildBookingList(
  products: CartItemType[],
  deliveryOption: DeliveryType,
  userId: string,
  address: Address | null,
  billingAddress: Address | null,
  instructions: string,
  paymentIntent: string,
): Booking[] {
  return products.map((item) => ({
    userId,
    dressId: item._id,
    dateBooked: item.dateBooked,
    blockOutPeriod: [],
    price: parseInt(item.price),
    address: {
      company: address?.company ?? "",
      address: address?.address ?? "",
      apartment: address?.apartment ?? "",
      suburb: address?.suburb ?? "",
      city: address?.city ?? "",
      country: address?.country ?? "",
      postCode: address?.postCode ?? "",
    },
    billingAddress: {
      company: billingAddress?.company ?? "",
      address: billingAddress?.address ?? "",
      apartment: billingAddress?.apartment ?? "",
      suburb: billingAddress?.suburb ?? "",
      city: billingAddress?.city ?? "",
      country: billingAddress?.country ?? "",
      postCode: billingAddress?.postCode ?? "",
    },
    deliveryType: deliveryOption,
    tracking: "",
    isShipped: false,
    isReturned: false,
    paymentIntent,
    size: item.size,
    status: BookingStatus.NA,
    instructions: instructions ?? "",
  }));
}
