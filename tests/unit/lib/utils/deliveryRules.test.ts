import { describe, expect, it } from "vitest";
import {
  RURAL_SURCHARGE,
  SHIPPING_FEE,
  calculateShippingFee,
  hasDeliveryItem,
  isBookingAllowedForDate,
  isDeliveryAllowedForDate,
  isPickupAllowedForDate,
} from "../../../../lib/utils/deliveryRules";
import { auckland } from "../../../../lib/utils/timezone";
import { DeliveryType } from "../../../../common/enums/DeliveryType";

// Naive strings are parsed as Auckland wall-clock by auckland.toZone, which is
// the whole point of the timezone helper — a bare `new Date()` here would make
// these assertions depend on the machine's local zone.
const at = (wallClock: string) => auckland.toZone(wallClock);

// Thursday. Delivery dispatches 2026-06-01 (cutoff 2026-05-31 20:00);
// Pickup dispatches 2026-06-03 (cutoff 2026-06-02 20:00).
const EVENT = "2026-06-04";

describe("hasDeliveryItem", () => {
  it("counts only DeliveryType.Delivery", () => {
    expect(hasDeliveryItem([{ deliveryType: DeliveryType.Delivery }])).toBe(true);
    expect(hasDeliveryItem([{ deliveryType: DeliveryType.Pickup }])).toBe(false);
    expect(
      hasDeliveryItem([{ deliveryType: DeliveryType.PickupDelivery }]),
    ).toBe(false);
    expect(hasDeliveryItem([])).toBe(false);
  });

  it("is true if any item in a mixed cart is Delivery", () => {
    expect(
      hasDeliveryItem([
        { deliveryType: DeliveryType.Pickup },
        { deliveryType: DeliveryType.Delivery },
      ]),
    ).toBe(true);
  });
});

describe("calculateShippingFee", () => {
  it("charges nothing when nothing is being delivered, rural or not", () => {
    expect(calculateShippingFee(false, false)).toBe(0);
    expect(calculateShippingFee(false, true)).toBe(0);
  });

  it("adds the rural surcharge on top of the base fee", () => {
    expect(calculateShippingFee(true, false)).toBe(SHIPPING_FEE);
    expect(calculateShippingFee(true, true)).toBe(SHIPPING_FEE + RURAL_SURCHARGE);
  });

  it("holds the published figures", () => {
    expect(SHIPPING_FEE).toBe(15);
    expect(RURAL_SURCHARGE).toBe(5);
  });
});

describe("the 8pm cutoff", () => {
  it("allows a delivery booking one second before 8pm the day before dispatch", () => {
    expect(isDeliveryAllowedForDate(EVENT, at("2026-05-31T19:59:59"))).toBe(true);
  });

  it("refuses at exactly 8pm — the cutoff is exclusive", () => {
    expect(isDeliveryAllowedForDate(EVENT, at("2026-05-31T20:00:00"))).toBe(false);
  });

  it("refuses after 8pm", () => {
    expect(isDeliveryAllowedForDate(EVENT, at("2026-05-31T20:00:01"))).toBe(false);
    expect(isDeliveryAllowedForDate(EVENT, at("2026-06-01T09:00:00"))).toBe(false);
  });

  it("gives Pickup its own, later cutoff", () => {
    expect(isPickupAllowedForDate(EVENT, at("2026-06-02T19:59:59"))).toBe(true);
    expect(isPickupAllowedForDate(EVENT, at("2026-06-02T20:00:00"))).toBe(false);
  });

  it("closes Delivery while Pickup is still open for the same date", () => {
    // The divergence that made a single shared gate wrong: at this instant a
    // Pickup item is still bookable and a Delivery item is not.
    const now = at("2026-06-01T09:00:00");

    expect(isDeliveryAllowedForDate(EVENT, now)).toBe(false);
    expect(isPickupAllowedForDate(EVENT, now)).toBe(true);
  });
});

describe("isBookingAllowedForDate", () => {
  it("dispatches on the item's own delivery type", () => {
    const now = at("2026-06-01T09:00:00");

    expect(isBookingAllowedForDate(EVENT, DeliveryType.Pickup, now)).toBe(true);
    expect(isBookingAllowedForDate(EVENT, DeliveryType.Delivery, now)).toBe(false);
  });

  it("treats the unused mixed variants as Delivery", () => {
    const now = at("2026-06-01T09:00:00");

    expect(
      isBookingAllowedForDate(EVENT, DeliveryType.PickupDelivery, now),
    ).toBe(false);
    expect(
      isBookingAllowedForDate(EVENT, DeliveryType.DeliveryPickup, now),
    ).toBe(false);
  });
});
