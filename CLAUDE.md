# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint via next lint
```

There are no tests in this project.

## Architecture

**Dress for Less** is a Next.js 14 dress rental e-commerce app using the Pages Router. Users browse dresses, select a rental date, add to cart, and check out via Stripe. Admins manage bookings and users through a protected dashboard.

### Data sources

The app has two separate data stores:

- **Sanity CMS** — dress catalogue and FAQ content. Queries live in `sanity/sanity.query.ts` (GROQ). The Sanity Studio is embedded at `/studio`. Images are resolved via `@sanity/image-url`.
- **MongoDB** — users, carts, and bookings. Two clients are initialised in `lib/db/db.ts`: a raw `MongoClient` (used by NextAuth's adapter) and a `mongoose` connection (`dbConnect()`). Mongoose schemas are in `lib/db/schema.ts`; DAO functions are in `lib/db/booking-dao.ts`, `cart-dao.ts`, and `user-dao.ts`.

### Auth

NextAuth (`pages/api/auth/[...nextauth].ts`) handles auth with two providers:
- **Google OAuth** — via `GoogleProvider`
- **Magic link email** — via `EmailProvider`; verification emails are sent with Resend (`src/components/Emails/MagicLinkEmail`)

On sign-in, a `createUser` call upserts the user into the custom `AllUsers` MongoDB collection (separate from NextAuth's own adapter collections). JWT strategy is used for sessions.

### API layer

All API routes live under `pages/api/`. Client-side calls go through the axios instance in `src/api/client.ts`, which intercepts 401/403 responses and redirects to `/login`.

Key routes:
- `pages/api/payment/intent.ts` — creates a Stripe PaymentIntent (NZD, requires session)
- `pages/api/payment/paymentConfirm.ts` — marks a reservation paid, redeems its coupons, allocates the order number, sends the receipt
- `pages/api/booking.ts` — POST is checkout's *reserve* step (see Checkout flow); GET/PATCH/DELETE are availability and admin management
- `pages/api/booking/release.ts` — hands an unpaid reservation back when payment fails
- `pages/api/cart.ts` — cart operations; `pages/api/syncCart.ts` merges a guest cart into a logged-in user's cart on login
- `pages/api/admin/bookings.ts` — admin-only booking management

### Context providers

Nested in `pages/_app.tsx` (outer → inner): `SessionProvider` → `GlobalContextProvider` → `UserContextProvider` → `CartProvider` → `NavigationContextProvider`.

- **GlobalContext** (`src/context/GlobalContext.tsx`) — fetches all dresses and FAQ from the API on mount; provides `getDressWithId`, `getHomeScreenDresses`, `getFavouriteDresses`
- **UserContext** (`src/context/UserContext.tsx`) — reads the NextAuth session, fetches the custom user record from MongoDB, and syncs any guest `localCart` (from `localStorage`) to the DB on login
- **CartContext** (`src/context/CartContext.tsx`) — tracks cart item count; falls back to `localStorage` for unauthenticated users
- **NavigationContext** — controls mobile nav open/close state

### Guest cart

Unauthenticated users' cart items are stored in `localStorage` under the key `localCart` via `src/hooks/useLocalStorage.ts`. On login, `UserContext` calls `syncCart` to migrate these items to the DB, then clears local storage.

### Checkout flow

1. Product page → user picks a size and rental date → "Add to Cart"
2. Cart page (`/cart`) → review items
3. Checkout page (`/checkout`) → address form → "Continue to payment" creates the PaymentIntent → Stripe card element
4. "Submit Booking" **reserves before it charges** — see below
5. `/order-success` — calls `paymentConfirm`, which is what actually marks the booking paid

**Checkout reserves, then charges.** `POST /api/booking` runs every check that could
make an order impossible — coupon usability, duplicate/availability/blockout — and
writes the booking row with `reservedAt` set and `paymentSuccess: false`, *before*
`stripe.confirmPayment` is called (`src/components/Checkout/PaymentForm/index.tsx`).

The invariant the whole design exists to hold: **money and booking move together, or
neither moves.** A refund is not a safety net here — it would be evidence the design
failed. The original bug was the opposite order: a coupon that ran out mid-checkout
took the customer's money and gave them no booking.

- **The unpaid booking row *is* the dress hold.** `getBookingAvailabilityByDress` and
  `checkDuplicateBooking` count every row regardless of `paymentSuccess`, so a
  reservation blocks its date for free.
- **A hold has no expiry.** It stops blocking when its row is deleted, and a row is only
  deleted once its PaymentIntent has been *cancelled*. Releasing a date on a timer while
  its payment was still confirmable is exactly how a dress gets booked twice: the hold
  stops counting, someone else takes the date, then the original 3DS completes.
  `RESERVATION_TTL_MINUTES` (`lib/utils/reservation.ts`) says when a hold becomes
  eligible for *reconciling*, not when it stops blocking.
- **`lib/booking/reconcileReservation.ts` is the only sanctioned way to destroy a
  reservation.** It cancels the PaymentIntent, then deletes the row — or, if the cancel
  fails because the payment already succeeded, **promotes** the reservation into a real
  booking instead. Returns `cancelled` / `promoted` / `unresolved`; `unresolved` leaves
  the row blocking, because blocking a date we could have sold is recoverable and
  selling one twice is not. No other code path deletes a reservation.
- **Coupon slots are claimed, not just checked.** `claimCoupon` (`lib/db/coupon-dao.ts`)
  takes a slot with a single guarded `findOneAndUpdate` whose filter *is* the capacity
  condition, so two customers checking out at the same instant can't both be told yes.
  The pipeline-form update prunes lapsed claims and appends the new one in the same
  write, and excludes this checkout's own claim from the count so a retry is idempotent.
  Claims live in `pendingClaims` on the coupon itself — capacity and claim in one
  document is what makes a single atomic write possible.
  `isCouponUsableByUser` counts other customers' live claims against capacity (the
  customer's own claim makes a coupon *usable* to them, not blocked); `getCouponStatus`
  deliberately does not, so the admin table doesn't report a code as Redeemed because
  someone abandoned a cart. A claim expires with the reservation it belongs to
  (`reservationExpiry`), and is handed back everywhere a reservation dies — the
  reserve's own failure paths, `reconcileReservation`, and the cancelled webhook.
- **The reserve verifies again after writing.** The pre-write check and the write aren't
  atomic, and availability is a count against per-size stock across overlapping windows,
  which no single-document guard can express. So it re-checks counting only rows that
  `outranksReservation` (`lib/utils/checkBookingAvailability.ts`) says take precedence —
  a total ordering, so exactly one side of a race backs out rather than both. Undoing is
  free because nothing has been charged.
- **The server sets the Stripe amount**, pinning the PaymentIntent to its own computed
  total and refusing to raise it above the quoted figure.
- **Order numbers are allocated at confirmation**, so abandoned checkouts don't burn them.
- **A customer's own stale hold is reconciled on retry** (`findOwnBookingHolds`), or a
  declined card would leave them blocked by their own ghost.

**Stripe, not the browser, is the authority on payment.**
`pages/api/webhooks/checkout.ts` handles `payment_intent.succeeded` and calls the same
`confirmReservation` that `/order-success` does — whichever arrives first wins, the
other reports `alreadyConfirmed` and does nothing (the guard is the `paymentSuccess`
condition on the `updateMany`). `payment_intent.canceled` drops the reservation
outright — that intent can never be confirmed again, so it is the one case where
deleting a row without cancelling first is safe. `payment_intent.payment_failed` is
deliberately **not** handled: a declined card leaves the intent in
`requires_payment_method`, still confirmable, and freeing the date on that event is how
a retry ends up charged with no booking. A succeeded payment with *no* reservation
should be unreachable; it raises an admin alert and deliberately does **not** refund
automatically — moving money is never part of the normal machinery.

Not every payment is a rental, though, so the webhook routes on a `kind`
(`common/enums/PaymentKind.ts`) that `pages/api/payment/intent.ts` stamps into the
PaymentIntent's metadata — `rental` by default, `tryOn` from the try-on flow. Try-ons
live in a different collection entirely, so without this every successful try-on looked
like an orphaned rental charge and alerted. Both branches confirm the same way and both
treat a missing row as the same alarm. Rental intents created before `kind` existed
carry no marker, so the rental branch also checks the try-on collection before alerting.

`pages/api/cron/sweep-reservations.ts` (POST + `Bearer CRON_SECRET`, like the other
crons) reconciles lapsed holds — rentals and try-ons in one pass — every 15 minutes via
`.github/workflows/sweep-reservations.yml`. It is not the only thing that can: both
reserve paths reconcile lapsed holds on demand when one blocks them, so a scheduler
outage delays cleanup rather than quietly taking dates out of sale. That on-demand path
is the load-bearing one — a slot only needs freeing at the moment somebody wants it,
which is exactly when the reserve looks.

### Try-on bookings

A separate flow (`/try-on`) with its own collection (`TryOnBookingSchema`), its own
availability (`TryOnAvailabilitySchema`, managed from `/admin`), and a flat
`TRY_ON_FEE`; booking one grants the customer a `TRY_ON_COUPON_AMOUNT` coupon.

It holds the same invariant as the rental checkout, by the same means — **the unpaid
row is the slot hold, written before the card is touched.** It did not always: it used
to charge first and write the row afterwards, so a slot taken in between left a
customer charged with no appointment, and two customers could both pay for the same
slot because the uniqueness index only refused the second *write*, after both cards had
been hit.

- **`POST /api/tryOnBooking` is the reserve**, called before `stripe.confirmPayment`
  (`src/components/TryOn/PaymentForm/index.tsx`). It verifies the intent is the
  caller's own and is for `TRY_ON_FEE`, reconciles the customer's own stale holds
  (`findOwnTryOnHolds`) and any lapsed hold blocking it, then upserts the row on
  `{ paymentIntent }` with `reservedAt` set and `paymentSuccess: false`.
- **The unique index on `{ date, timeSlot }` is the race guard**, and it deliberately
  covers every row rather than only paid ones — that scoping is what allowed the double
  sale. `autoIndex` is off in production, so it is built by
  `scripts/migrate-tryon-slot-index.js`, not by declaring it in the schema.
- **`lib/tryOn/confirmTryOnReservation.ts`** marks the row paid, grants the coupon and
  sends the confirmation. Idempotent via the `paymentSuccess` guard on its own write, so
  `/api/tryOnBooking/confirm` and the webhook can race without double-granting or
  double-emailing.
- **`lib/tryOn/reconcileTryOnReservation.ts` is the only sanctioned way to destroy a
  hold** — cancel the PaymentIntent, then delete; promote instead if the cancel fails
  because the payment already succeeded; leave the row holding if it can't find out.
  Same three outcomes and same reasoning as the rental version.
- **Admin-created try-ons** (`pages/api/admin/tryOnBookings.ts`) carry
  `paymentIntent: "ADMIN_MANUAL"` and `paymentSuccess: true`, so they never appear as
  holds and are never swept.

`stripe.confirmPayment` here passes `redirect: "if_required"` with no `return_url`, so a
3DS challenge needing a full redirect fails rather than completing. Reserve-then-charge
makes that failure *safe* — the hold survives, the sweep reconciles it, and nobody is
charged without an appointment — but supporting redirect-based 3DS for try-ons needs a
return page and hasn't been built.

### Rural delivery detection

The shipping address field on checkout (`AddressForm`) is an NZ Post-backed autocomplete (`AddressAutocomplete`, Headless UI `Combobox`): typing calls `pages/api/address/search.ts`, selecting a suggestion calls `pages/api/address/[addressId].ts` — both proxy `lib/nzpost/client.ts` (OAuth2 client_credentials against NZ Post's ParcelAddress API) so the credentials never reach the browser. A selected address's `isRuralDelivery`/`dpid` land in `ProductContext.validatedAddress` (not `CheckoutForm` local state, since sibling `OrderSummary` needs it too for the live total). Hand-editing the address text after selecting a suggestion clears `validatedAddress`, requiring re-selection. When rural, a $5 surcharge (`RURAL_SURCHARGE` in `lib/utils/deliveryRules.ts`, alongside `calculateShippingFee`) is added to the displayed total and the client-computed Stripe amount, matching how the base `SHIPPING_FEE` already flows through. `pages/api/booking.ts` independently re-confirms rural status server-side via `resolveRuralDeliveryStatus` (by DPID) before computing the persisted `totalPrice`, rather than trusting the client-supplied flag — falling back to it only if NZ Post is unreachable at that moment.

### Booking availability

Each `BookingItem` stores a `blockedFrom`/`blockedUntil` window (not the individual dates) marking when a dress is physically unavailable — computed once at creation by `calculateBookingWindow` (`lib/utils/bookingWindow.ts`) from the event date's weekday and `deliveryType`. Delivery/Post dispatch and turnaround offsets vary by weekday (see the lookup table in that file); Pickup is constant (1 day before, ready 3 days after) when stored. Availability for a new candidate date is checked with `isDateBlockedByExistingBooking`, which compares the candidate's own window (computed with an *optimistic* same-day Pickup offset, since "collect day-before or day-of" is a real choice — existing bookings always use the conservative day-before figure) against each existing booking's stored window.

Two independent gates must both pass for a date to be bookable:
1. **Notice-from-today** — `isBookingAllowedForDate` (`lib/utils/deliveryRules.ts`), which dispatches on the item's own `deliveryType` to `isPickupAllowedForDate`/`isDeliveryAllowedForDate`: cutoff is 8pm the day before that method's dispatch date.
2. **No conflict** — `isDateBlockedByExistingBooking` against existing bookings of the same dress+size, counted against that size's stock.

Both gates are enforced client-side *and* re-checked by the reserve, because a browser-only gate is not a gate: gate 1 used to live only in the Calendar and (for Delivery items alone) the checkout form, so a Pickup item past its cutoff — or any item on a tab left open past 8pm — reserved and charged normally. `POST /api/booking` now applies gate 1 to every item against one instant, before the price lookup and before anything with a side effect, returning a 409 distinct from the "already booked" one. Admin paths (PATCH, `pages/api/admin/bookings.ts`) deliberately skip it, matching the Calendar's `disableForAdmin`.

Client (`src/components/ProductPage/Calendar/index.tsx`) and server (`lib/utils/checkBookingAvailability.ts`, used by `pages/api/booking.ts`) share the same functions, so they can't drift apart. The lapsed-hold filter lives in the DAO for the same reason — the Calendar reads availability through `GET /api/booking`, so filtering at a call site would let the two views disagree. `scripts/migrate-booking-windows.js` backfills `blockedFrom`/`blockedUntil` for bookings created before this scheme existed.

### Admin

`/admin` renders `src/components/Admin/` tabs for Bookings, Dresses, and Users. `BookingStatus` enum (`common/enums/BookingStatus.ts`) drives the status workflow (In Progress → Being Returned → Washing → Drying → Packed → Returned, etc.).

### Shared types

All shared TypeScript types (`DressType`, `UserType`, `Booking`, `CartType`, etc.) are in `common/types/index.ts`. Enums live in `common/enums/`.

### UI components

Use the shared components instead of native HTML elements: `src/components/Button/index.tsx` instead of `<button>`, `src/components/Input/index.tsx` instead of `<input>`, and `src/components/Toggle/index.tsx` instead of a native checkbox/toggle.

### Environment variables required

`MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, `RESEND_EMAIL_ADDRESS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (signing secret for `pages/api/webhooks/checkout.ts` — without it the webhook rejects every event and confirmation falls back to the browser alone), `CRON_SECRET` (bearer token the scheduled jobs under `pages/api/cron/` require), `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NZPOST_CLIENT_ID`, `NZPOST_CLIENT_SECRET`, and optionally `NEXT_PUBLIC_COMING_SOON` (set to `"true"` to show the coming-soon page instead of the app).
