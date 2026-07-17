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
- `pages/api/payment/paymentConfirm.ts` — confirms payment and creates booking
- `pages/api/booking.ts` — CRUD for bookings
- `pages/api/cart.ts` — cart operations; `pages/api/syncCart.ts` merges a guest cart into a logged-in user's cart on login
- `pages/api/validateBooking.ts` — checks if a dress/size/date combination is already booked
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
3. Checkout page (`/checkout`) → address form + Stripe card element → creates PaymentIntent → confirms payment → creates booking in MongoDB
4. `/order-success` — confirmation page

### Booking availability

Each `BookingItem` stores a `blockedFrom`/`blockedUntil` window (not the individual dates) marking when a dress is physically unavailable — computed once at creation by `calculateBookingWindow` (`lib/utils/bookingWindow.ts`) from the event date's weekday and `deliveryType`. Delivery/Post dispatch and turnaround offsets vary by weekday (see the lookup table in that file); Pickup is constant (1 day before, ready 3 days after) when stored. Availability for a new candidate date is checked with `isDateBlockedByExistingBooking`, which compares the candidate's own window (computed with an *optimistic* same-day Pickup offset, since "collect day-before or day-of" is a real choice — existing bookings always use the conservative day-before figure) against each existing booking's stored window.

Two independent gates must both pass for a date to be bookable:
1. **Notice-from-today** — `isPickupAllowedForDate`/`isDeliveryAllowedForDate` (`lib/utils/deliveryRules.ts`): cutoff is 8pm the day before that method's dispatch date.
2. **No conflict** — `isDateBlockedByExistingBooking` against existing bookings of the same dress+size, counted against that size's stock.

Client (`src/components/ProductPage/Calendar/index.tsx`) and server (`lib/utils/checkBookingAvailability.ts`, used by `pages/api/booking.ts` and `pages/api/validateBooking.ts`) share the same functions, so they can't drift apart. `scripts/migrate-booking-windows.js` backfills `blockedFrom`/`blockedUntil` for bookings created before this scheme existed.

### Admin

`/admin` renders `src/components/Admin/` tabs for Bookings, Dresses, and Users. `BookingStatus` enum (`common/enums/BookingStatus.ts`) drives the status workflow (In Progress → Being Returned → Washing → Drying → Packed → Returned, etc.).

### Shared types

All shared TypeScript types (`DressType`, `UserType`, `Booking`, `CartType`, etc.) are in `common/types/index.ts`. Enums live in `common/enums/`.

### UI components

Use the shared components instead of native HTML elements: `src/components/Button/index.tsx` instead of `<button>`, `src/components/Input/index.tsx` instead of `<input>`, and `src/components/Toggle/index.tsx` instead of a native checkbox/toggle.

### Environment variables required

`MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, `RESEND_EMAIL_ADDRESS`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, and optionally `NEXT_PUBLIC_COMING_SOON` (set to `"true"` to show the coming-soon page instead of the app).
