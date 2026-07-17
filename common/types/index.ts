import { PortableTextBlock } from "sanity";
import { BookingStatus } from "../enums/BookingStatus";
import { DeliveryType } from "../enums/DeliveryType";
import { TryOnStatus } from "../enums/TryOnStatus";

export type ProfileType = {
  _id: string;
  fullName: string;
  headline: string;
  profileImage: {
    alt: string;
    image: string;
  };
  shortBio: string;
  email: string;
  fullBio: PortableTextBlock[];
  location: string;
  resumeURL: string;
  socialLinks: string[];
  skills: string[];
};

export type UserType = {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  mobileNumber: string;
  instagramHandle?: string;
  photo?: string;
  role: "admin" | "user";
};

export type DressType = {
  _id: string;
  name: string;
  description: string;
  size: string;
  images: string[];
  tags: { _type: string; label: string; _key: string }[];
  price: string;
  length: string;
  brand: string;
  rrp: string;
  stretch: string;
  recommendedSize?: string[];
  notes?: string;
  xs: string;
  s: string;
  m: string;
  l: string;
  xl: string;
  _updatedAt: string;
};

export type ImageType = {
  src: string;
  alt: string;
};

export type User = {
  email: string;
  name: string;
};

export type CartType = {
  _id?: string;
  dressId: string;
  userId?: string;
  dateBooked: string;
  size: string;
  deliveryType: DeliveryType;
};

export type CartItemType = {
  _id: string;
  name: string;
  description: string;
  size: string;
  images: string[];
  tags: { _type: string; label: string; _key: string }[];
  price: string;
  length: string;
  brand: string;
  rrp: string;
  stretch: string;
  dateBooked: string;
  cartItemId: string;
  deliveryType: DeliveryType;
};

export type Address = {
  address: string;
  suburb: string;
  city: string;
  country: string;
  postCode: string;
  company?: string;
  apartment?: string;
};

export type BookingItem = {
  _id?: string;
  dressId: string;
  dateBooked: string;
  blockedFrom: string;
  blockedUntil: string;
  deliveryType: DeliveryType;
  address?: Address;
  size: String;
  price: number;
  instructions?: string;
  dress?: DressType;
};

export type Booking = {
  _id?: string;
  userId: string;
  items: BookingItem[];
  totalPrice: number;
  billingAddress: Address;
  tracking: string;
  isShipped: boolean;
  isReturned: boolean;
  paymentIntent: string;
  user?: UserType[];
  status: BookingStatus;
  couponIds?: string[];
  discountAmount?: number;
};

// Pairs a Booking (order) with one of its line items — used by admin views
// that need to display/select a single dress without duplicating the
// shared order-level fields (user, status, billing address, etc).
export type BookingLineItem = {
  booking: Booking;
  item: BookingItem;
};

export type BookingAvailability = {
  _id?: string;
  dressId: string;
  size: String;
  dateBooked: string;
  blockedFrom: string;
  blockedUntil: string;
};

export type Sizes = {
  xs?: string;
  s?: string;
  m?: string;
  l?: string;
  xl?: string;
};

export type BlockOut = {
  _id?: string;
  dressId: string;
  size: string;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt?: string;
};

export type TryOnAvailability = {
  _id?: string;
  date: string;
  timeSlots: string[];
  createdAt?: string;
};

export type Faq = {
  question: string;
  answer: string;
};

export type OrderHistory = {
  _id?: string;
  dressId: string;
  userId: string;
  dateBooked: string;
  blockedFrom: string;
  blockedUntil: string;
  price: number;
  address?: Address;
  deliveryType: string;
  tracking: string;
  isShipped: boolean;
  isReturned: boolean;
  paymentIntent?: string;
  size: String;
  dressName: string;
  dressDescription: string;
  dressImages: string;
};

export type TryOnBooking = {
  _id?: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  timeSlot: string;
  price: number;
  paymentIntent: string;
  paymentSuccess: boolean;
  status: TryOnStatus;
  user?: UserType[];
  createdAt?: string;
};

export type Coupon = {
  _id?: string;
  userId: string;
  discountAmount: number;
  startDate: string;
  expiryDate: string;
  isRedeemed: boolean;
  createdAt?: string;
};

export type OrderReceipt = {
  _id?: string;
  dressId: string;
  name: string;
  dateBooked: string;
  blockedFrom: string;
  blockedUntil: string;
  price: number;
  address?: Address;
  billingAddress?: Address;
  deliveryType: string;
  tracking: string;
  isShipped: boolean;
  isReturned: boolean;
  paymentIntent?: string;
  size: String;
  dressName: string;
  dressDescription: string;
  dressImage: string;
};
