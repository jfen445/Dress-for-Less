import { expect, type Locator, type Page } from "@playwright/test";
import { auckland } from "../../../lib/utils/timezone";

// The product page's MUI DateCalendar. Dates are derived from the real today
// (see data.ts), so the target month is often not the one the calendar opens
// on — every helper here navigates to it first.

const MONTH_LABEL = ".MuiPickersCalendarHeader-label";

async function showMonth(page: Page, isoDate: string) {
  const target = auckland.toZone(isoDate);
  const wanted = target.format("MMMM YYYY");
  const header = page.locator(MONTH_LABEL);

  await expect(header).toBeVisible();

  // A year of headroom is far more than the six months the calendar allows.
  for (let step = 0; step < 13; step += 1) {
    if ((await header.textContent())?.trim() === wanted) return;
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(header).not.toHaveText(
      (await header.textContent())?.trim() ?? "",
      { timeout: 2000 },
    ).catch(() => undefined);
  }

  throw new Error(`Could not navigate the calendar to ${wanted}`);
}

/** The day cell for a date, with the calendar navigated to its month. */
export async function calendarDay(page: Page, isoDate: string): Promise<Locator> {
  await showMonth(page, isoDate);

  return page.getByRole("gridcell", {
    name: auckland.toZone(isoDate).format("D"),
    exact: true,
  });
}

export async function pickCalendarDay(page: Page, isoDate: string) {
  const day = await calendarDay(page, isoDate);
  await day.click();
}
