# NZ Post Integration

This app uses two separate NZ Post APIs, sharing one OAuth2 setup:

1. **ParcelAddress API** — address autocomplete + rural delivery detection at checkout.
2. **ParcelLabel API** — courier label (consignment) creation from the admin Bookings screen.

## Auth (shared)

`lib/nzpost/auth.ts` — OAuth2 `client_credentials` grant, shared by both APIs (same NZ Post OAuth app/credentials).

- Token endpoint: `POST https://oauth.nzpost.co.nz/as/token.oauth2`
- Env vars: `NZPOST_CLIENT_ID`, `NZPOST_CLIENT_SECRET` (in `.env.local`)
- `getAccessToken()` caches the token in memory (~23h, with a 5-minute refresh margin) — not a hard guarantee across serverless cold starts, but avoids re-fetching on every call within a warm instance.
- `nzPostFetch<T>(url, init)` — shared authed-fetch helper. Adds `Authorization: Bearer <token>` to every request. Retries once with a forced-fresh token on a 401.
- **Gotcha**: ParcelLabel additionally requires a `client_id` header on the request itself (not just the token request) — added at the ParcelLabel call site (`lib/nzpost/parcelLabel.ts`), *not* in the shared `nzPostFetch`, because ParcelAddress does **not** want/need it. Don't move this into the shared helper — it broke ParcelAddress when tried.
- On any non-2xx response, `nzPostFetch` reads and logs the full response body (`NZPostApiError.responseBody`) — NZ Post's error responses carry the real validation reason (`code`/`details`/`message` fields) that explain *why* a request was rejected. When debugging, log this with `JSON.stringify(x, null, 2)` — `console.log`'s default object-inspect depth (2) truncates nested arrays/objects as `[Object]`/`[Array]` and will hide the actual error detail.

## ParcelAddress API — checkout rural delivery detection

**Files**: `lib/nzpost/client.ts`, `pages/api/address/search.ts`, `pages/api/address/[addressId].ts`, `src/api/address.ts`, `src/components/Checkout/CheckoutForm/AddressForm/` (+ `AddressAutocomplete.tsx`).

- Search: `GET https://api.nzpost.co.nz/parceladdress/2.0/domestic/addresses?q=&count=` → address suggestions (`full_address`, `address_id`, `dpid`).
- Detail by address_id: `GET .../addresses/{address_id}` → full address incl. `is_rural_delivery`, `rural_delivery_number`.
- Detail by dpid: `GET .../addresses/dpid/{dpid}` — used for server-side re-verification (`resolveRuralDeliveryStatus`).
- The two proxy routes (`pages/api/address/*`) require a logged-in session and never expose `NZPOST_CLIENT_ID`/`SECRET` to the browser.
- Checkout: the address field is a Headless UI `Combobox` — typing debounces a search, selecting a suggestion fetches the detail and populates suburb/city/postcode. Hand-editing the address after selecting invalidates the validated/rural state (must re-select).
- Rural surcharge: `RURAL_SURCHARGE = 5` in `lib/utils/deliveryRules.ts`, combined with the base `SHIPPING_FEE` via `calculateShippingFee(hasDelivery, isRuralDelivery)`.
- `pages/api/booking.ts` **re-verifies** rural status server-side (by `dpid`) before computing the charge — never trusts the client-supplied flag alone, since it's a real-money line item. Falls back to the client flag (logged) only if NZ Post is unreachable at that moment.
- `Address` type/schema fields added: `nzPostAddressId`, `nzPostDpid`, `isRuralDelivery`, `ruralDeliveryNumber` (item-level shipping address only, not billing).

## ParcelLabel API — admin courier label creation

**Files**: `lib/nzpost/parcelLabel.ts`, `lib/nzpost/senderConfig.ts`, `pages/api/admin/labels.ts`, `src/api/admin.ts` (`createLabels`), `src/components/Admin/CreateLabelModal/`, wired into `src/components/Admin/Bookings/index.tsx`'s "Create label" button (Delivery tab only).

- Create Label(s) - Domestic: `POST https://api.nzpost.co.nz/parcellabel/v3/labels`.
- **One API call = one consignment = one delivery address.** `parcel_details` is an array, but it's multiple *parcels within one consignment* (e.g. multiple dresses in the same order going to the same address) — NZ Post's API has no way to batch multiple *different* delivery addresses into a single call. If an admin selects bookings for several different customers, `pages/api/admin/labels.ts` makes one NZ Post call per distinct booking, sequentially, inside a single client-to-admin-API request (the browser only makes one `POST /api/admin/labels` regardless of how many bookings are selected).
- Response: `{ consignment_id, message_id, success }` — no label file. The `consignment_id` is written back to `Booking.tracking`. **Fetching/downloading the actual label PDF (NZ Post's separate `Download Label(s)` endpoint) is not implemented** — out of scope for now, a natural follow-up.
- `getServiceCode(city)` — `CPOLP` for Auckland, `CPOLTPA4` elsewhere (mirrors the pre-existing CSV-export logic in `Bookings/index.tsx`, kept as a separate copy since one is client-side/CSV and one is server-side/label).
- Rural add-on: when `item.address.isRuralDelivery` is true, `CPOLRD` is added to that parcel's `add_ons` — **verify this exact code against the live API console/account manager**, it was inferred from NZ Post's documented add-on code list, not explicitly confirmed.
- Parcel weight/dimensions: fixed default for every parcel (`DEFAULT_PARCEL_DIMENSIONS` in `senderConfig.ts`, 30×30×30cm/2kg) — no per-dress weight data exists anywhere in the app.
- Duplicate guard: rows in the picker modal whose booking already has a `tracking` value show a "Label already created" badge but remain selectable (warn, don't block — useful for reprints).
- Server-side, `pages/api/admin/labels.ts` fetches each booking + its customer fresh from the DB (`getBookingsById` / `findUserById`) rather than trusting client-supplied address/contact data, and returns a per-booking success/failure result so one NZ Post rejection doesn't sink the whole batch.

### Merchant/sender config (`lib/nzpost/senderConfig.ts`)

Plain exported consts — **not env vars**, filled in directly in this file (committed to the repo; account/address config, not secrets):

- `NZPOST_ACCOUNT_NUMBER`, `NZPOST_SITE_CODE` — from your NZ Post merchant account.
- `SENDER_NAME`, `SENDER_PHONE`, `SENDER_EMAIL`, `SENDER_COMPANY` — sender contact details on every label.
- `PICKUP_ADDRESS` — the warehouse/pickup address (street/suburb/city/postcode).
- `DEFAULT_PARCEL_DIMENSIONS` — fixed parcel size/weight used for every label.

## Known limitations / follow-ups

- No PDF label download (only consignment creation) — needs NZ Post's `Download Label(s)` endpoint (`GET .../labels/{consignment_id}?format=PDF`, returns raw binary).
- No per-dress weight/dimension data — every parcel uses the same fixed default.
- ParcelLabel API access on the NZ Post account behind `NZPOST_CLIENT_ID`/`SECRET` needs separate approval from ParcelAddress access (NZ Post requires requesting access per-API) — confirm this is granted before relying on label creation in production.
- The exact rural-delivery add-on code (`CPOLRD`) is inferred, not confirmed against the live API console.
- `pages/api/payment/intent.ts` still trusts the client-computed Stripe charge amount (pre-existing gap, unrelated to NZ Post specifically, but relevant to the rural surcharge flowing through it correctly).
