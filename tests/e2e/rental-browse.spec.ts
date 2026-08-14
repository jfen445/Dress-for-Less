import { data, expect, test } from "./fixtures/app";

// The catalogue and the product page are server-rendered from getStaticProps,
// so these assert the page renders rather than that an API was called — the
// client-side fetch only tops the catalogue up afterwards.

test("the catalogue renders the dresses", async ({ page }) => {
  await page.goto("/dresses");

  await expect(page.getByText(data.dress().name).first()).toBeVisible();
});

test("the product page renders the dress and its options", async ({ page }) => {
  await page.goto(`/dresses/products/${data.DRESS_ID}`);

  await expect(
    page.getByRole("heading", { name: data.dress().name }),
  ).toBeVisible();
  await expect(page.getByLabel("Select a size")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible();
});
