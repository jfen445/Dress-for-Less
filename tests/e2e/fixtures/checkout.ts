import { expect, type Locator, type Page } from "@playwright/test";
import { Api } from "./app";
import * as data from "./data";

// The steps between landing on /checkout and reaching the payment step. They
// are helpers rather than assertions: what each journey is *about* stays in its
// own test, and only the mechanics of driving the form live here.

/**
 * One line of the order summary, by its label. The summary is rendered twice —
 * a definition list for large screens and a popover for small ones — so this
 * deliberately reads only the visible copy rather than whichever came first in
 * the DOM.
 */
export const summaryLine = (page: Page, label: string): Locator =>
  page
    .locator("dl:visible > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

/**
 * Picks a shipping address the way a customer must: type, wait for NZ Post to
 * answer, choose a suggestion. Suburb, city and postcode stay disabled until a
 * suggestion is *selected*, so there is no way to fill this form by typing.
 */
export async function selectDeliveryAddress(
  page: Page,
  api: Api,
  detail: Record<string, unknown> = {},
) {
  const suggestion = data.addressSuggestion();

  api.set("GET /api/address/search", { addresses: [suggestion] });
  api.set(`GET /api/address/${suggestion.addressId}`, {
    address: data.addressDetail(detail),
  });

  await page.locator("#address").fill("12 Queen");
  await page.getByRole("option", { name: data.ADDRESS_FULL }).click();

  // The lookup fills these in; waiting on one of them is waiting for the
  // address to have been resolved, not merely offered.
  await expect(page.locator("#postCode")).toHaveValue("1010");
}

/** A billing address, which pickup orders have instead of a shipping one. */
export async function fillBillingAddress(page: Page) {
  await page.locator("#billingAddress").fill("12 Queen Street");
  await page.locator("#billingSuburb").fill("Auckland Central");
  await page.locator("#billingCity").fill("Auckland");
  await page.locator("#billingPostCode").fill("1010");
}

/**
 * The terms gate. The checkbox only opens the modal — agreement is the button
 * inside it, and that button stays disabled until the policies have actually
 * been scrolled through.
 */
export async function acceptTerms(page: Page) {
  await page.locator("#terms-and-conditions").click();

  const agree = page.getByRole("button", { name: "I have read and agree" });
  await expect(agree).toBeDisabled();

  // The capped, scrolling policies pane specifically — the modal's own outer
  // wrapper scrolls too, and comes first in the DOM.
  const policies = page.locator("div[class*='max-h-'][class*='overflow-y-auto']");
  await expect(policies).toHaveCount(1);
  await policies.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect(agree).toBeEnabled();
  await agree.click();
  await expect(page.locator("#terms-and-conditions")).toBeChecked();
}

/** The amount, in cents, the checkout asked Stripe to charge. */
export function requestedAmount(api: Api): number | null {
  const [intent] = api.called("POST", "/api/payment/intent");
  return intent ? Number(intent.url.searchParams.get("price")) : null;
}
