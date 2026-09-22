import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";
import { db, resetDb, seedDress, seedUser } from "../fakes/db";
import { resetDaoSpies, sendEmail } from "../fakes/daos";

vi.mock("../../lib/db/db", () => ({ dbConnect: vi.fn(async () => undefined) }));
vi.mock("../../lib/db/schema", async () => (await import("../fakes/daos")).schemaModule);
vi.mock("../../lib/db/booking-dao", async () => (await import("../fakes/daos")).bookingDao);
vi.mock("../../sanity/sanity.query", async () => (await import("../fakes/daos")).sanityQuery);
vi.mock("resend", async () => (await import("../fakes/daos")).resendModule);

// Stubbed so the props the cron hands the template can be inspected directly;
// rendering the real one would bury them in an element tree.
const ReturnReminderEmail = vi.fn((_props: any) => null);
vi.mock("@/components/Emails/ReturnReminder", () => ({
  default: ReturnReminderEmail,
  getReturnReminderSubject: () => "Friendly reminder",
}));

const handler = (await import("../../pages/api/cron/send-return-reminders")).default;

// 9am Auckland on Wednesday 3 June 2026. Midweek matters: Mon-Thu returns are
// chased the next day, so the delivery window is exactly yesterday. (Monday
// reaches back three days and the weekend chases nothing, which would blur
// what these tests are trying to isolate.)
// 21:00 UTC is 09:00 the next morning in Auckland, which is when the workflow
// fires — so "today" inside the handler is the 3rd, not the 2nd.
const NOW_ISO = "2026-06-02T21:00:00.000Z";
const TODAY = "2026-06-03";

let dressId: string;
let userId: string;

const seedPaidBooking = (item: Record<string, unknown>) => {
  db.bookings.push({
    _id: `booking_${db.bookings.length}`,
    userId,
    items: [
      {
        dressId,
        size: "M",
        deliveryType: "Delivery",
        blockedFrom: "2026-05-01",
        blockedUntil: "2026-06-10",
        price: 150,
        ...item,
      },
    ],
    totalPrice: 150,
    paymentIntent: "ADMIN_MANUAL",
    paymentSuccess: true,
    reservedAt: null,
  } as any);
};

async function runCron() {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: "POST",
    headers: { authorization: "Bearer correct-secret" },
  });

  await handler(req, res);

  return { status: res._getStatusCode(), body: res._getJSONData() as any };
}

beforeEach(() => {
  // shouldAdvanceTime so the 550ms Resend rate-limit pause between sends
  // resolves instead of hanging on a frozen clock.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(NOW_ISO));

  resetDb();
  resetDaoSpies();
  sendEmail.mockClear();
  ReturnReminderEmail.mockClear();

  process.env.CRON_SECRET = "correct-secret";
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_EMAIL_ADDRESS = "hello@example.com";

  userId = seedUser({ email: "customer@example.com", name: "Ada" })._id;
  dressId = seedDress({ price: "150", m: 1 })._id;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the return reminder cron", () => {
  it("chases a rental due back today but booked weeks ago", async () => {
    // The case the whole change exists for. Selecting on dateBooked alone
    // never loads this row, so the reminder is silently never sent — no error,
    // no retry, nothing to notice.
    seedPaidBooking({ dateBooked: "2026-05-20", returnDate: TODAY });

    const { status } = await runCron();

    expect(status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("stays quiet for a rental that runs for another fortnight", async () => {
    seedPaidBooking({ dateBooked: "2026-06-02", returnDate: "2026-06-16" });

    const { status } = await runCron();

    expect(status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("keys on the return date, not the event date", async () => {
    // A dress worn today is not due back today — the derivation never produces
    // a same-day return. Chasing on dateBooked would email this customer while
    // they are still at the event.
    seedPaidBooking({ dateBooked: TODAY, returnDate: "2026-06-04" });

    await runCron();

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("gives the template both dates", async () => {
    seedPaidBooking({ dateBooked: "2026-05-20", returnDate: TODAY });

    await runCron();

    expect(ReturnReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        dateBooked: "2026-05-20",
        returnDate: TODAY,
      }),
    );
  });

  it("chases a drop-off due back at the weekend", async () => {
    // 2026-06-06 is a Saturday. Only Post returns roll off the weekend, so a
    // Pickup falling due then has to be chased on the day like any other —
    // the weekday branch this replaced sent nothing at all on a Saturday.
    vi.setSystemTime(new Date("2026-06-05T21:00:00.000Z"));
    seedPaidBooking({
      dateBooked: "2026-06-05",
      returnDate: "2026-06-06",
      deliveryType: "Pickup",
    });

    await runCron();

    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("ignores an unpaid hold", async () => {
    seedPaidBooking({ dateBooked: "2026-06-02", returnDate: TODAY });
    db.bookings[0].paymentSuccess = false;

    expect((await runCron()).body.message).toBe("No bookings to remind");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
