import api from "./client";

export type AddressSuggestion = {
  fullAddress: string;
  addressId: string;
  dpid: string;
};

export type AddressDetail = {
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
};

export async function searchAddresses(query: string, count = 8) {
  return api.get<{ addresses: AddressSuggestion[] }>(
    `/api/address/search?q=${encodeURIComponent(query)}&count=${count}`,
  );
}

export async function getAddressDetail(addressId: string) {
  return api.get<{ address: AddressDetail }>(
    `/api/address/${encodeURIComponent(addressId)}`,
  );
}
