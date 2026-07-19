import { BookingStatus } from "../enums/BookingStatus";
import { DeliveryType } from "../enums/DeliveryType";

export interface IUser {
  mongoID?: string;
  name: string;
  email: string;
  password?: string;
  mobileNumber: string;
  instagramHandle?: string;
  photo?: string;
}

export interface ICart {
  dressId: string;
  userId: string;
  dateBooked: string;
  size: string;
  deliveryType: DeliveryType;
}

export interface IBookingItem {
  dressId: string;
  dateBooked: string;
  blockedFrom: string;
  blockedUntil: string;
  deliveryType: string;
  address?: IAddress;
  size: String;
  price: number;
  instructions?: string;
}

export interface IBooking {
  userId: string;
  items: IBookingItem[];
  totalPrice: number;
  billingAddress: IAddress;
  tracking: string;
  isShipped: boolean;
  isReturned: boolean;
  paymentIntent: string;
  paymentSuccess: boolean;
  status: BookingStatus;
  couponIds?: string[];
  discountAmount?: number;
  orderNumber: string;
}

export interface IAddress {
  address: string;
  suburb?: string;
  city?: string;
  country?: string;
  postCode?: string;
  company?: string;
  apartment?: string;
  nzPostAddressId?: string;
  nzPostDpid?: string;
  isRuralDelivery?: boolean;
  ruralDeliveryNumber?: string;
}
