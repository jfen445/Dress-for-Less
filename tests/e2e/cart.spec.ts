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

test("a guest fills a local cart without being sent to sign in", async ({
  page,
  api,
}) => {
  await page.goto(productPage);
  await pickSizeAndDate(page);
  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect
    .poll(async () => (await localCart(page)) ?? [])
    .toMatchObject([
      {
        dressId: data.DRESS_ID,
        size: "M",
        dateBooked: data.bookableDate(),
        deliveryType: "Delivery",
      },
    ]);

  // The item stays local: no account exists to attach it to yet.
  expect(api.called("POST", "/api/cart")).toHaveLength(0);
  expect(page.url()).toContain(productPage);

  // The specific reason this used to fail. /api/user answers 401 without a
  // session, and the API client turns any 401 into a redirect to /login — so
  // asking for an account a guest hasn't got is what navigated them away
  // before the local cart could be written.
  expect(api.called("GET", "/api/user")).toHaveLength(0);
});

test("a guest's second identical item is refused rather than duplicated", async ({
  page,
}) => {
  await page.goto(productPage);
  await pickSizeAndDate(page);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect.poll(async () => (await localCart(page))?.length ?? 0).toBe(1);

  await page.reload();
  await pickSizeAndDate(page);
  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect(page.getByText("Item already in cart")).toBeVisible();
  expect((await localCart(page)).length).toBe(1);
});

test("a guest can see what they added", async ({ page }) => {
  await page.goto(productPage);
  await pickSizeAndDate(page);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect.poll(async () => (await localCart(page))?.length ?? 0).toBe(1);

  // The cart page resolves each line's dress by id, which needs no session.
  await page.goto("/cart");

  await expect(
    page.getByRole("heading", { name: "Shopping Cart" }),
  ).toBeVisible();
  await expect(page.getByText(data.dress().name).first()).toBeVisible();
});

test("a guest's cart follows them into their account", async ({ page, api }) => {
  // The whole point of the local cart: shop first, sign in later, lose nothing.
  await page.goto(productPage);
  await pickSizeAndDate(page);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect.poll(async () => (await localCart(page))?.length ?? 0).toBe(1);

  signedIn(api);
  api.set("GET /api/cart", [data.cartItem()]);
  await page.goto("/cart");

  await expect
    .poll(() => api.called("POST", "/api/syncCart").length)
    .toBeGreaterThan(0);

  // Stamped with the new owner, because syncCart refuses items belonging to
  // anyone but the caller.
  expect(api.called("POST", "/api/syncCart")[0].body.cart).toMatchObject([
    {
      dressId: data.DRESS_ID,
      size: "M",
      dateBooked: data.bookableDate(),
      userId: data.USER_ID,
    },
  ]);

  await expect.poll(async () => (await localCart(page)) ?? []).toEqual([]);
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
