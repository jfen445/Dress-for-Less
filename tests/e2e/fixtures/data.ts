// Fixture builders for the browser tests. Kept deliberately close to the shapes
// the API routes actually return, so a contract change shows up as a broken
// journey rather than a passing test against a stale stub.

import dressFixture from "./dress.json";
import { auckland } from "../../../lib/utils/timezone";
import { calculateBookingWindow } from "../../../lib/utils/bookingWindow";
import { DeliveryType } from "../../../common/enums/DeliveryType";

// The same JSON the Node-level Sanity intercept serves to getStaticProps, so
// the server-rendered dress and the client-fetched one cannot drift apart.
export const DRESS_ID = dressFixture._id;
export const USER_ID = "user-e2e-1";
export const CUSTOMER_EMAIL = "customer@example.com";

// Dates are derived from the real current date rather than pinned, because the
// Calendar is server-rendered: freezing only the browser's clock makes the
// month header disagree with the server's and React discards the whole root as
// a hydration mismatch.
//
// Both choices below hold on any day of the year, so they are facts about the
// rules rather than restatements of them:
//
//   bookable      — 30 days out. The largest dispatch offset in the Post table
//                   is 5 days, so its 8pm-day-before cutoff is at least three
//                   weeks away, whatever weekday it lands on.
//   past cutoff   — tomorrow. The smallest Delivery dispatch offset is 2 days,
//                   so tomorrow's dispatch was yesterday and its cutoff passed
//                   the day before that. Never bookable, whatever weekday it is.
export const bookableDate = () => auckland.now().add(30, "day").format("YYYY-MM-DD");
export const pastCutoffDate = () => auckland.now().add(1, "day").format("YYYY-MM-DD");

export const dress = (over: Record<string, unknown> = {}) => ({
  ...dressFixture,
  ...over,
});

// The home page's hero indexes dresses[0..6] unguarded, so the catalogue stub
// has to be at least seven long — matching what the Sanity intercept serves.
export const dressList = (count = 8) =>
  Array.from({ length: count }, (_, index) =>
    index === 0
      ? dress()
      : dress({
          _id: `${DRESS_ID}-${index}`,
          name: `${dressFixture.name} ${index}`,
          // Distinct images: the hero picks seven dresses with unique first
          // images, so repeating one collapses the list and it indexes past
          // the end. Mirrors tests/e2e/sanity-intercept.cjs.
          images: [`https://cdn.sanity.io/images/e2e/test/gown-${index}.jpg`],
        }),
  );

export const user = (over: Record<string, unknown> = {}) => ({
  _id: USER_ID,
  email: CUSTOMER_EMAIL,
  name: "Ada Lovelace",
  role: "user",
  ...over,
});

export const session = (over: Record<string, unknown> = {}) => ({
  user: { email: CUSTOMER_EMAIL, name: "Ada Lovelace", image: null },
  expires: "2099-01-01T00:00:00.000Z",
  ...over,
});

export const cartItem = (over: Record<string, unknown> = {}) => ({
  _id: "cart-item-1",
  dressId: DRESS_ID,
  userId: USER_ID,
  dateBooked: bookableDate(),
  size: "M",
  deliveryType: "Delivery",
  ...over,
});

// An item-level availability row, as GET /api/booking?dressId= returns them.
// The blocked window is built with the same function that stores it in
// production, so the fixture is a real booking rather than a guess at one.
export const bookingAvailability = (over: Record<string, unknown> = {}) => {
  const dateBooked = (over.dateBooked as string) ?? bookableDate();

  return {
    _id: "booking-existing-1",
    paymentIntent: "pi_someone_else",
    paymentSuccess: true,
    reservedAt: null,
    dressId: DRESS_ID,
    size: "M",
    dateBooked,
    ...calculateBookingWindow(dateBooked, DeliveryType.Delivery),
    ...over,
  };
};

export const coupon = (over: Record<string, unknown> = {}) => ({
  _id: "coupon-e2e-1",
  userId: USER_ID,
  discountAmount: 20,
  discountType: "flat",
  appliesTo: "cart",
  startDate: "2020-01-01T00:00:00.000Z",
  expiryDate: "2030-01-01T00:00:00.000Z",
  reason: "Try-on credit",
  ...over,
});
