// One-off migration: backfill blockedFrom/blockedUntil (the delivery-method-
// aware booking window) onto every existing BookingItem, replacing the old
// flat blockOutPeriod array. See lib/utils/bookingWindow.ts for the live
// version of this calculation — this script duplicates it in plain JS since
// it runs outside the Next.js/TypeScript build; keep the two in sync if the
// timing table ever changes.
//
// Usage:
//   node --env-file=.env.local scripts/migrate-booking-windows.js --dry-run
//   node --env-file=.env.local scripts/migrate-booking-windows.js
//
// Safe to re-run — recomputes every item unconditionally from its stored
// dateBooked + deliveryType, so already-migrated items just get overwritten
// with the same values.

const { MongoClient } = require("mongodb");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const AUCKLAND_TZ = "Pacific/Auckland";
const DRY_RUN = process.argv.includes("--dry-run");

function isNaiveDateString(input) {
  return typeof input === "string" && !/[Zz]|[+-]\d{2}:?\d{2}$/.test(input);
}

function toAuckland(input) {
  return isNaiveDateString(input)
    ? dayjs.tz(input, AUCKLAND_TZ)
    : dayjs(input).tz(AUCKLAND_TZ);
}

// Mirrors POST_TIMING_BY_WEEKDAY in lib/utils/bookingWindow.ts.
const POST_TIMING_BY_WEEKDAY = {
  1: { dispatchOffsetDays: 4, turnaroundOffsetDays: 4 }, // Mon
  2: { dispatchOffsetDays: 5, turnaroundOffsetDays: 4 }, // Tue
  3: { dispatchOffsetDays: 5, turnaroundOffsetDays: 4 }, // Wed
  4: { dispatchOffsetDays: 3, turnaroundOffsetDays: 6 }, // Thu
  5: { dispatchOffsetDays: 2, turnaroundOffsetDays: 5 }, // Fri
  6: { dispatchOffsetDays: 3, turnaroundOffsetDays: 4 }, // Sat
  0: { dispatchOffsetDays: 4, turnaroundOffsetDays: 3 }, // Sun
};

// Mirrors the conservative Pickup timing in lib/utils/bookingWindow.ts —
// stored windows always use the conservative (day-before) figure.
const PICKUP_TIMING = { dispatchOffsetDays: 1, turnaroundOffsetDays: 3 };

function calculateBookingWindow(dateBooked, deliveryType) {
  const date = toAuckland(dateBooked);
  const timing =
    String(deliveryType).toLowerCase() === "pickup"
      ? PICKUP_TIMING
      : POST_TIMING_BY_WEEKDAY[date.day()];

  return {
    blockedFrom: date.subtract(timing.dispatchOffsetDays, "day").format("YYYY-MM-DD"),
    blockedUntil: date.add(timing.turnaroundOffsetDays, "day").format("YYYY-MM-DD"),
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const bookings = db.collection("bookings");

    const docs = await bookings.find({ items: { $exists: true } }).toArray();

    console.log(
      `Found ${docs.length} booking document(s).${DRY_RUN ? " (dry run — no writes will be made)" : ""}`,
    );

    let updatedDocs = 0;
    let updatedItems = 0;

    for (const doc of docs) {
      let changed = false;

      const items = doc.items.map((item) => {
        const { blockedFrom, blockedUntil } = calculateBookingWindow(
          item.dateBooked,
          item.deliveryType,
        );

        if (
          item.blockedFrom !== blockedFrom ||
          item.blockedUntil !== blockedUntil ||
          item.blockOutPeriod !== undefined
        ) {
          changed = true;
          updatedItems += 1;
        }

        const { blockOutPeriod, ...rest } = item;
        return { ...rest, blockedFrom, blockedUntil };
      });

      if (!changed) continue;

      updatedDocs += 1;

      if (DRY_RUN) {
        console.log(
          `[dry run] booking ${doc._id}: would update ${items.length} item(s)`,
        );
        continue;
      }

      await bookings.updateOne({ _id: doc._id }, { $set: { items } });
    }

    console.log(
      `${DRY_RUN ? "Would update" : "Updated"} ${updatedItems} item(s) across ${updatedDocs} booking document(s).`,
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
