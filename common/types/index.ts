import { PortableTextBlock } from "sanity";
import { BookingStatus } from "../enums/BookingStatus";
import { DeliveryType } from "../enums/DeliveryType";
import { TryOnStatus } from "../enums/TryOnStatus";
import { CouponType } from "../enums/CouponType";
import { CouponScope } from "../enums/CouponScope";

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

// Mirrors the Sanity `dress` schema's validation (common/schemas/dress.ts):
// every field here is `rule.required()` there except the per-size stock
// counts, which a dress legitimately may not carry all of.
export type DressType = {
  _id: string;
  name: string;
  description: string;
  size: string;
  images: string[];
  tags: string[];
  price: number;
  length: string;
  brand: string;
  rrp: number;
  stretch: string;
  condition?: string;
  recommendedSize?: string[];
  notes?: string;
  xs?: number;
  s?: number;
  m?: number;
  l?: number;
  xl?: number;
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
  tags: string[];
  price: number;
  length: string;
  brand: string;
  rrp: number;
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
  // NZ Post ParcelAddress validation — shipping address only, undefined/false = unvalidated or manual entry
  nzPostAddressId?: string;
  nzPostDpid?: string;
  isRuralDelivery?: boolean;
  ruralDeliveryNumber?: string;
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
  notes?: string;
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
  // Present when checkout reserved this row before charging. Absent on
  // bookings created before the reservation scheme, and on admin-created ones.
  reservedAt?: string;
  user?: UserType[];
  status: BookingStatus;
  couponIds?: string[];
  discountAmount?: number;
  orderNumber?: string;
  instructionsSentAt?: string;
  // Resend message IDs for the instruction emails sent for this booking.
  // instructionsSentAt is only a claim that Resend accepted the send; these
  // are what can be looked up afterwards to see if it actually landed.
  instructionsEmailIds?: string[];
  // Resend message IDs for the return reminders sent about this booking.
  returnReminderEmailIds?: string[];
  downloadedAt?: string;
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
  xs?: number;
  s?: number;
  m?: number;
  l?: number;
  xl?: number;
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
  _id?: string;
  question: string;
  answer: string;
  section: string;
  order?: number;
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
  // Set on rows the reserve step wrote. An *unpaid* row carrying one is a live
  // hold on its slot; once paymentSuccess is true it's just history, which is
  // why confirmation leaves it alone (as the rental flow does).
  reservedAt?: string;
  status: TryOnStatus;
  user?: UserType[];
  // Resend message IDs for try-on reminders, from either the cron or the
  // admin button — both send the same email to this row.
  reminderEmailIds?: string[];
  createdAt?: string;
};

export type Coupon = {
  _id?: string;
  userId?: string;
  code?: string;
  discountAmount: number;
  discountType: CouponType;
  appliesTo?: CouponScope;
  isGlobal: boolean;
  maxRedemptions?: number;
  redeemedByUserIds?: string[];
  // Slots held by checkouts that have reserved but not yet paid — a redemption
  // on loan. Counts against capacity until it lapses or is handed back.
  // See lib/utils/couponRules.ts.
  pendingClaims?: CouponClaim[];
  startDate: string;
  expiryDate: string;
  isRedeemed: boolean;
  reason?: string;
  createdAt?: string;
};

export type CouponClaim = {
  userId: string;
  paymentIntent: string;
  expiresAt: string;
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
  orderNumber?: string;
};
