import { BookingStatus } from "../enums/BookingStatus";

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
}

export interface IBookingItem {
  dressId: string;
  dateBooked: string;
  blockOutPeriod: string[];
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
}

export interface IAddress {
  address: string;
  suburb?: string;
  city?: string;
  country?: string;
  postCode?: string;
  company?: string;
  apartment?: string;
}
