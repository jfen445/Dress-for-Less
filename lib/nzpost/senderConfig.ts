// Merchant/account config for NZ Post ParcelLabel requests.
// These are account & address details (not secrets), but they are REQUIRED
// placeholders — label creation will fail until real values are filled in.

export const NZPOST_ACCOUNT_NUMBER = "92507705";
export const NZPOST_SITE_CODE = "96306";

export const SENDER_NAME = "Dress for Less NZ";
export const SENDER_PHONE = "+6424555105";
export const SENDER_EMAIL = "dressforless@gmail.com";
export const SENDER_COMPANY = "Dress for Less";

export const PICKUP_ADDRESS = {
  street: "22 Advance Way",
  suburb: "Albany",
  city: "Auckland",
  postcode: "0632",
  country_code: "NZ",
};

// Fixed default parcel size/weight — no per-dress weight/dimension data
// exists yet, so every label uses the same figure (NZ Post's own "Medium
// Box" example).
export const DEFAULT_PARCEL_DIMENSIONS = {
  length_cm: 30,
  width_cm: 30,
  height_cm: 30,
  weight_kg: 2,
};
