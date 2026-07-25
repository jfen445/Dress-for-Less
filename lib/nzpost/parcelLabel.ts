import { nzPostFetch } from "./auth";
import {
  DEFAULT_PARCEL_DIMENSIONS,
  NZPOST_ACCOUNT_NUMBER,
  NZPOST_SITE_CODE,
  PICKUP_ADDRESS,
  SENDER_COMPANY,
  SENDER_EMAIL,
  SENDER_NAME,
  SENDER_PHONE,
} from "./senderConfig";
import { Booking, BookingItem, UserType } from "../../common/types";

const NZPOST_PARCELLABEL_BASE =
  "https://api.nzpost.co.nz/parcellabel/v3/labels";

// Auckland vs rest-of-NZ CourierPost product codes — mirrors the equivalent
// logic already used for the CSV export in Bookings/index.tsx (kept
// separate: that copy runs client-side for CSV, this one is server-only).
export function getServiceCode(city?: string): string {
  return city?.trim().toLowerCase() === "auckland" ? "CPOLP" : "CPOLTPA4";
}

const RURAL_DELIVERY_ADD_ON = "CPOLRD";

type CreateLabelAddress = {
  street: string;
  suburb: string;
  city: string;
  postcode: string;
  country_code: string;
};

type CreateLabelParcel = {
  service_code: string;
  add_ons: string[];
  return_indicator: "OUTBOUND";
  description: string;
  dimensions: typeof DEFAULT_PARCEL_DIMENSIONS;
};

type CreateLabelRequest = {
  carrier: "COURIERPOST";
  sender_reference_1?: string;
  account_number: string;
  sender_details: {
    name: string;
    phone: string;
    site_code: number;
    company_name: string;
    email: string;
  };
  receiver_details: {
    name: string;
    phone?: string;
    email?: string;
  };
  pickup_address: CreateLabelAddress;
  delivery_address: CreateLabelAddress;
  parcel_details: CreateLabelParcel[];
};

type CreateLabelResponse = {
  consignment_id: string;
  message_id: string;
  success: boolean;
};

export function buildParcelDetail(item: BookingItem): CreateLabelParcel {
  return {
    service_code: getServiceCode(item.address?.city),
    add_ons: item.address?.isRuralDelivery ? [RURAL_DELIVERY_ADD_ON] : [],
    return_indicator: "OUTBOUND",
    description: "Medium Box",
    dimensions: DEFAULT_PARCEL_DIMENSIONS,
  };
}

export async function createLabel(
  booking: Booking,
  user: UserType,
): Promise<{ consignmentId: string }> {
  const deliveryAddress = booking.items[0]?.address;

  const body: CreateLabelRequest = {
    carrier: "COURIERPOST",
    sender_reference_1: booking.orderNumber,
    account_number: NZPOST_ACCOUNT_NUMBER,
    sender_details: {
      name: SENDER_NAME,
      phone: SENDER_PHONE,
      // NZ Post's docs show site_code as a JSON number (e.g. 96306); the
      // config const is a string for editing convenience.
      site_code: Number(NZPOST_SITE_CODE),
      company_name: SENDER_COMPANY,
      email: SENDER_EMAIL,
    },
    receiver_details: {
      name: user.name,
      phone: user.mobileNumber,
      email: user.email,
    },
    pickup_address: PICKUP_ADDRESS,
    delivery_address: {
      street: deliveryAddress?.address ?? "",
      suburb: deliveryAddress?.suburb ?? "",
      city: deliveryAddress?.city ?? "",
      postcode: deliveryAddress?.postCode ?? "",
      country_code: "NZ",
    },
    parcel_details: booking.items.map(buildParcelDetail),
  };

  const data = await nzPostFetch<CreateLabelResponse>(NZPOST_PARCELLABEL_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      client_id: process.env.NZPOST_CLIENT_ID as string,
    },
    body: JSON.stringify(body),
  });

  return { consignmentId: data.consignment_id };
}
