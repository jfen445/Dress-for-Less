import { nzPostFetch } from "./auth";

export { NZPostApiError } from "./auth";

const NZPOST_ADDRESS_BASE =
  "https://api.nzpost.co.nz/parceladdress/2.0/domestic/addresses";

export type NZPostAddressSuggestion = {
  fullAddress: string;
  addressId: string;
  dpid: string;
};

export type NZPostAddressDetail = {
  addressId?: string;
  dpid: string;
  streetNumber?: string;
  street?: string;
  streetType?: string;
  suburb?: string;
  city?: string;
  postcode?: string;
  buildingName?: string;
  unitType?: string;
  unitValue?: string;
  country?: string;
  isRuralDelivery: boolean;
  ruralDeliveryNumber?: string;
  fullAddress?: string;
};

type NZPostSearchResponse = {
  success: boolean;
  addresses: { full_address: string; address_id: string; dpid: string }[];
  message_id: string;
};

type NZPostDetailResponse = {
  success: boolean;
  address: {
    street_number?: string | number;
    street?: string;
    street_type?: string;
    suburb?: string;
    city?: string;
    is_rural_delivery: boolean;
    rural_delivery_number?: string | number;
    postcode?: string;
    dpid: string;
    building_name?: string;
    unit_type?: string;
    unit_value?: string | number;
    country?: string;
  };
  message_id: string;
};

function mapDetail(
  detail: NZPostDetailResponse["address"],
  addressId?: string,
): NZPostAddressDetail {
  return {
    addressId,
    dpid: detail.dpid,
    streetNumber:
      detail.street_number !== undefined
        ? String(detail.street_number)
        : undefined,
    street: detail.street,
    streetType: detail.street_type,
    suburb: detail.suburb,
    city: detail.city,
    postcode: detail.postcode,
    buildingName: detail.building_name,
    unitType: detail.unit_type,
    unitValue:
      detail.unit_value !== undefined ? String(detail.unit_value) : undefined,
    country: detail.country,
    isRuralDelivery: detail.is_rural_delivery,
    ruralDeliveryNumber:
      detail.rural_delivery_number !== undefined
        ? String(detail.rural_delivery_number)
        : undefined,
  };
}

export async function searchAddresses(
  query: string,
  count = 8,
): Promise<NZPostAddressSuggestion[]> {
  const url = `${NZPOST_ADDRESS_BASE}?q=${encodeURIComponent(query)}&count=${count}`;
  const data = await nzPostFetch<NZPostSearchResponse>(url);

  return data.addresses.map((a) => ({
    fullAddress: a.full_address,
    addressId: a.address_id,
    dpid: a.dpid,
  }));
}

export async function getAddressDetail(
  addressId: string,
): Promise<NZPostAddressDetail> {
  const url = `${NZPOST_ADDRESS_BASE}/${encodeURIComponent(addressId)}`;
  const data = await nzPostFetch<NZPostDetailResponse>(url);
  return mapDetail(data.address, addressId);
}

export async function getAddressDetailByDpid(
  dpid: string,
): Promise<NZPostAddressDetail | null> {
  try {
    const url = `${NZPOST_ADDRESS_BASE}/dpid/${encodeURIComponent(dpid)}`;
    const data = await nzPostFetch<NZPostDetailResponse>(url);
    return mapDetail(data.address);
  } catch (err) {
    console.error("NZ Post getAddressDetailByDpid failed", { dpid, err });
    return null;
  }
}

export async function resolveRuralDeliveryStatus(
  dpid: string | undefined,
  clientClaimedRural: boolean,
): Promise<{ isRural: boolean; verified: boolean }> {
  if (!dpid) {
    return { isRural: false, verified: true };
  }

  const detail = await getAddressDetailByDpid(dpid);

  if (!detail) {
    return { isRural: clientClaimedRural, verified: false };
  }

  return { isRural: detail.isRuralDelivery, verified: true };
}
