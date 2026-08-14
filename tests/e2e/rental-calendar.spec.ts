import { data, expect, test } from "./fixtures/app";
import { calendarDay } from "./fixtures/calendar";

// Gate 1 (notice-from-today) and gate 2 (conflict with an existing booking) as
// the shopper actually meets them: a day they cannot pick. Both gates are
// re-checked by the reserve — see tests/routes/booking.reserve.test.ts — but
// this is where a regression first becomes visible to a customer.

const productPage = `/dresses/products/${data.DRESS_ID}`;

const openProduct = async (page: any, size = "M") => {
  await page.goto(productPage);
  await page.getByLabel("Select a size").selectOption(size);
};

test("offers a date that clears the cutoff", async ({ page }) => {
  await openProduct(page);

  await expect(await calendarDay(page, data.bookableDate())).toBeEnabled();
});

test("greys out a date whose dispatch cutoff has passed", async ({ page }) => {
  // Tomorrow: the shortest Delivery dispatch offset is two days, so its cutoff
  // is always already behind us.
  await openProduct(page);

  await expect(await calendarDay(page, data.pastCutoffDate())).toBeDisabled();
});

test("greys out a date already taken by an existing booking", async ({
  page,
  api,
}) => {
  // One dress in stock for size M, and a confirmed booking whose window covers
  // the date.
  api.set("GET /api/booking", [data.bookingAvailability()]);

  await openProduct(page);

  await expect(await calendarDay(page, data.bookableDate())).toBeDisabled();
});

test("still offers the date for a size that is not booked out", async ({
  page,
  api,
}) => {
  // Availability is counted per size, so a booking on M must not close L.
  api.set("GET /api/booking", [data.bookingAvailability()]);

  await openProduct(page, "L");

  await expect(await calendarDay(page, data.bookableDate())).toBeEnabled();
});

test("greys out a date the admin has blocked out", async ({ page, api }) => {
  const date = data.bookableDate();
  api.set("GET /api/blockouts", [
    {
      _id: "blockout-1",
      dressId: data.DRESS_ID,
      size: "M",
      startDate: `${date}T00:00:00.000Z`,
      endDate: `${date}T00:00:00.000Z`,
    },
  ]);

  await openProduct(page);

  await expect(await calendarDay(page, date)).toBeDisabled();
});

test("cannot add to cart before a date is picked", async ({ page }) => {
  await openProduct(page);

  await expect(page.getByRole("button", { name: "Add to cart" })).toBeDisabled();
});
