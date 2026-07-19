const NZPOST_OAUTH_URL = "https://oauth.nzpost.co.nz/as/token.oauth2";
const NZPOST_ADDRESS_BASE =
  "https://api.nzpost.co.nz/parceladdress/2.0/domestic/addresses";
const REQUEST_TIMEOUT_MS = 8000;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

export class NZPostApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "NZPostApiError";
    this.status = status;
  }
}

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

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function fetchAccessToken(): Promise<string> {
  const clientId = process.env.NZPOST_CLIENT_ID as string;
  const clientSecret = process.env.NZPOST_CLIENT_SECRET as string;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(NZPOST_OAUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new NZPostApiError(
        `NZ Post token request failed with status ${response.status}`,
        response.status,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    return data.access_token;
  } finally {
    clearTimeout(timeout);
  }
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (
    !forceRefresh &&
    cachedToken &&
    cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()
  ) {
    return cachedToken.accessToken;
  }

  const accessToken = await fetchAccessToken();
  // expires_in is ~86399s; we don't trust it precisely, just cache with a safety margin.
  cachedToken = { accessToken, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return accessToken;
}

async function nzPostFetch<T>(url: string): Promise<T> {
  let token = await getAccessToken();

  const doFetch = async (accessToken: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  let response = await doFetch(token);

  if (response.status === 401) {
    token = await getAccessToken(true);
    response = await doFetch(token);
  }

  if (!response.ok) {
    throw new NZPostApiError(
      `NZ Post API request failed with status ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

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
