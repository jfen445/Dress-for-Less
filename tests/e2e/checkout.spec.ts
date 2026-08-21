import { data, expect, signedIn, test, type Api } from "./fixtures/app";
import {
  acceptTerms,
  fillBillingAddress,
  requestedAmount,
  selectDeliveryAddress,
  summaryLine,
} from "./fixtures/checkout";

// Checkout from the cart to the payment step, for both delivery methods.
//
// It stops where the card begins. Stripe's own iframe is never loaded here (see
// playwright.config.ts) — what happens once it is, including the reserve that
// must precede the charge, is tests/components/CheckoutPaymentForm.test.tsx.
// The line these draw is the amount: the last thing checkout decides before
// Stripe is involved, and the one number that ties the summary the customer
// read to the payment they are about to authorise.

const DRESS_PRICE = 150;
const SHIPPING = 15;
const RURAL_SURCHARGE = 5;

/** A signed-in customer with one item in the cart, on the checkout page. */
async function openCheckout(
  page: any,
  api: Api,
  item: Record<string, unknown> = {},
) {
  signedIn(api);
  api.set("GET /api/cart", [data.cartItem(item)]);

  // Through the cart rather than straight to /checkout, because it is the cart
  // that decides which items the checkout is for — the ?id= list.
  await page.goto("/cart");
  await page.getByRole("button", { name: "Checkout" }).first().click();

  await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible();
}

const continueToPayment = (page: any) =>
  page.getByRole("button", { name: "Continue to payment" }).click();

test("a delivery order totals the dress plus shipping, and charges that", async ({
  page,
  api,
}) => {
  await openCheckout(page, api);

  await expect(summaryLine(page, "Subtotal")).toHaveText("$150.00");
  await expect(summaryLine(page, "Shipping")).toHaveText("$15.00");
  await expect(summaryLine(page, "Total")).toHaveText("$165.00");

  await selectDeliveryAddress(page, api);
  await acceptTerms(page);
  await continueToPayment(page);

  await expect(
    page.getByRole("heading", { name: "Payment details" }),
  ).toBeVisible();

  // The figure the customer agreed to, in cents, is the figure Stripe is asked
  // for. (The server pins the intent to its own total as well — the browser is
  // not trusted with it — but a mismatch here is a customer being quoted one
  // price and charged another.)
  await expect
    .poll(() => requestedAmount(api))
    .toBe((DRESS_PRICE + SHIPPING) * 100);
});

test("a rural address adds its surcharge to both the total and the charge", async ({
  page,
  api,
}) => {
  await openCheckout(page, api);

  await selectDeliveryAddress(page, api, { isRuralDelivery: true });

  await expect(page.getByText("Rural delivery — $5 surcharge applies.")).toBeVisible();
  await expect(summaryLine(page, "Rural delivery surcharge")).toHaveText("$5.00");
  await expect(summaryLine(page, "Total")).toHaveText("$170.00");

  await acceptTerms(page);
  await continueToPayment(page);

  await expect
    .poll(() => requestedAmount(api))
    .toBe((DRESS_PRICE + SHIPPING + RURAL_SURCHARGE) * 100);
});

test("a pick-up order pays no shipping and is never asked for one", async ({
  page,
  api,
}) => {
  await openCheckout(page, api, { deliveryType: "Pickup" });

  // Nothing is being posted, so there is no shipping address to collect and no
  // shipping to charge — but a billing address is still needed for the card.
  await expect(
    page.getByRole("heading", { name: "Shipping address" }),
  ).toHaveCount(0);
  await expect(summaryLine(page, "Shipping")).toHaveText("$0.00");
  await expect(summaryLine(page, "Total")).toHaveText("$150.00");

  await fillBillingAddress(page);
  await acceptTerms(page);
  await continueToPayment(page);

  await expect(
    page.getByRole("heading", { name: "Payment details" }),
  ).toBeVisible();
  await expect.poll(() => requestedAmount(api)).toBe(DRESS_PRICE * 100);
});

test("the terms have to be accepted before payment is reached", async ({
  page,
  api,
}) => {
  await openCheckout(page, api);

  await selectDeliveryAddress(page, api);
  await continueToPayment(page);

  await expect(
    page.getByText("You must accept the terms and conditions to proceed."),
  ).toBeVisible();
  expect(api.called("POST", "/api/payment/intent")).toHaveLength(0);
});

test("an unverified address is refused rather than posted to", async ({
  page,
  api,
}) => {
  // Typed but never selected from the suggestions, so NZ Post never resolved
  // it — and suburb and postcode were never filled, which is what the form
  // checks. Free-typing an address is how a parcel goes nowhere.
  await openCheckout(page, api);

  await page.locator("#address").fill("12 Queen Street");
  await acceptTerms(page);
  await continueToPayment(page);

  await expect(
    page.getByText("Please fill in all required fields with a valid address."),
  ).toBeVisible();
  expect(api.called("POST", "/api/payment/intent")).toHaveLength(0);
});

test("an item past its cutoff stops the order instead of charging for it", async ({
  page,
  api,
}) => {
  // Gate 1, notice-from-today, as it lands on someone who left the tab open:
  // the cart won't link here once a date has lapsed, so this is the checkout's
  // own re-check of a page that was loaded while the date was still fine.
  signedIn(api);
  api.set("GET /api/cart", [
    data.cartItem({ dateBooked: data.pastCutoffDate() }),
  ]);

  await page.goto(`/checkout?id=cart-item-1`);

  await expect(page.getByText(/it's too late to book/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to payment" }),
  ).toHaveCount(0);
});
