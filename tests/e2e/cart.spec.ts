import { data, expect, signedIn, test } from "./fixtures/app";
import { pickCalendarDay } from "./fixtures/calendar";

const productPage = `/dresses/products/${data.DRESS_ID}`;

// Delivery is the product page's default, so a delivery booking picks a size
// and a date and nothing else. Pickup has to be chosen first — and choosing it
// clears the date, so the order here is not incidental.
async function pickSizeAndDate(page: any) {
  await page.getByLabel("Select a size").selectOption("M");
  await pickCalendarDay(page, data.bookableDate());
}

async function pickUpInstead(page: any) {
  await page.getByRole("button", { name: "Pick Up (Auckland)" }).click();
}

const localCart = (page: any) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("localCart") ?? "null"));

test("a guest adding to cart is sent to sign in, and keeps nothing locally", async ({
  page,
  api,
}) => {
  // Pinning what actually happens today, which is NOT what CLAUDE.md describes.
  //
  // addDressToCart calls getUser(session?.user.email ?? "") before anything
  // else (ProductPage/index.tsx:88). With no session that request is a 401, and
  // the axios interceptor in src/api/client.ts turns any 401 into
  // window.location.href = "/login" — so the guest is navigated away before the
  // localStorage branch below it can run. The guest cart is unreachable from
  // this page. See the note in the accompanying report.
  await page.goto(productPage);
  await pickSizeAndDate(page);
  await page.getByRole("button", { name: "Add to cart" }).click();

  await page.waitForURL("**/login", { timeout: 10_000 });

  expect(await localCart(page)).toBeNull();
  expect(api.called("POST", "/api/cart")).toHaveLength(0);
});

test("a signed-in customer's delivery booking goes straight to the database", async ({
  page,
  api,
}) => {
  signedIn(api);

  await page.goto(productPage);
  await pickSizeAndDate(page);
  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect.poll(() => api.called("POST", "/api/cart").length).toBe(1);

  const posts = api.called("POST", "/api/cart");
  expect(posts).toHaveLength(1);
  expect(posts[0].body.cartItem).toMatchObject({
    dressId: data.DRESS_ID,
    size: "M",
    dateBooked: data.bookableDate(),
    userId: data.USER_ID,
    deliveryType: "Delivery",
  });
});

test("a pick-up booking is carried into the cart as a pick-up", async ({
  page,
  api,
}) => {
  // The method chosen here decides both cutoffs and shipping for the rest of
  // the order, so it has to survive the trip to the cart intact.
  signedIn(api);

  await page.goto(productPage);
  await pickUpInstead(page);
  await pickSizeAndDate(page);
  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect.poll(() => api.called("POST", "/api/cart").length).toBe(1);

  expect(api.called("POST", "/api/cart")[0].body.cartItem).toMatchObject({
    dressId: data.DRESS_ID,
    size: "M",
    dateBooked: data.bookableDate(),
    deliveryType: "Pickup",
  });
});

test("switching method after picking a date makes them pick again", async ({
  page,
  api,
}) => {
  // The two methods have different cutoffs and different blocked windows, so a
  // date chosen under one is not automatically bookable under the other.
  // Clearing it is what stops a delivery date being booked as a pickup.
  signedIn(api);

  await page.goto(productPage);
  await pickSizeAndDate(page);
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();

  await pickUpInstead(page);

  await expect(page.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  expect(api.called("POST", "/api/cart")).toHaveLength(0);
});

test("a guest cart is migrated to the account on sign-in", async ({
  page,
  api,
}) => {
  // The item is already sitting in local storage from a signed-out visit.
  await page.goto("/cart");
  await page.evaluate(
    (item) => localStorage.setItem("localCart", JSON.stringify([item])),
    { dressId: data.DRESS_ID, dateBooked: data.bookableDate(), size: "M", deliveryType: "Delivery" },
  );

  signedIn(api);
  api.set("GET /api/cart", [data.cartItem()]);

  await page.reload();

  await expect
    .poll(() => api.called("POST", "/api/syncCart").length)
    .toBeGreaterThan(0);

  // Cleared once migrated, so it can't be re-synced on the next page load.
  await expect
    .poll(async () => (await localCart(page)) ?? [])
    .toEqual([]);
});

test("the cart lists what is in it, and offers checkout", async ({ page, api }) => {
  signedIn(api);
  api.set("GET /api/cart", [data.cartItem()]);

  await page.goto("/cart");

  await expect(page.getByRole("heading", { name: "Shopping Cart" })).toBeVisible();
  await expect(page.getByText(data.dress().name).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Checkout" }).first()).toBeEnabled();
});

test("an empty cart says so instead of offering checkout", async ({ page, api }) => {
  signedIn(api);
  api.set("GET /api/cart", []);

  await page.goto("/cart");

  await expect(page.getByText(/your rental cart is empty/i)).toBeVisible();
});
