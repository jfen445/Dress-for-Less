// One-off migration: backfill `returnDate` (the date a dress is due back with
// us) onto every existing BookingItem and drop the old `endDate`, which held
// the last day of the rental rather than the return.
//
// The tables below duplicate lib/utils/bookingWindow.ts in plain JS, since this
// runs outside the Next.js/TypeScript build. They are not kept in sync by hand:
// tests/unit/scripts/migrateReturnDates.test.ts imports both and fails if they
// ever disagree.
//
// Usage:
//   node --env-file=.env.local scripts/migrate-return-dates.js --dry-run
//   node --env-file=.env.local scripts/migrate-return-dates.js
//
// Safe to re-run: every item is recomputed from its stored dateBooked and
// deliveryType, so an already-migrated item is rewritten with the same values.
//
// Before writing anything, the script recomputes each item's blockedFrom and
// blockedUntil from the return date it just derived and compares them with what
// is already stored. Re-anchoring turnaround on the return date is supposed to
// be lossless for every existing booking, so any disagreement means the tables
// are wrong — and the whole run aborts without writing.

const { MongoClient } = require("mongodb");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const AUCKLAND_TZ = "Pacific/Auckland";

const POST_DISPATCH_OFFSET_BY_WEEKDAY = {
  1: 4, // Mon
  2: 5, // Tue
  3: 5, // Wed
  4: 3, // Thu
  5: 2, // Fri
  6: 3, // Sat
  0: 4, // Sun
};

const POST_RETURN_LAG_BY_WEEKDAY = {
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 3,
  6: 2,
  0: 1,
};

const POST_TURNAROUND_FROM_RETURN_BY_WEEKDAY = {
  1: 2,
  2: 3,
  3: 3,
  4: 3,
  5: 5,
  6: 4,
  0: 3,
};

const PICKUP_RETURN_LAG_DAYS = 1;
const PICKUP_TURNAROUND_FROM_RETURN_DAYS = 2;
const PICKUP_DISPATCH_OFFSET_DAYS = 1; // conservative; stored windows only

function isNaiveDateString(input) {
  return typeof input === "string" && !/[Zz]|[+-]\d{2}:?\d{2}$/.test(input);
}

function toAuckland(input) {
  return isNaiveDateString(input)
    ? dayjs.tz(input, AUCKLAND_TZ)
    : dayjs(input).tz(AUCKLAND_TZ);
}

function isPickup(deliveryType) {
  return String(deliveryType).toLowerCase() === "pickup";
}

function calculateReturnDate(eventDate, deliveryType) {
  const day = toAuckland(eventDate);
  const lag = isPickup(deliveryType)
    ? PICKUP_RETURN_LAG_DAYS
    : POST_RETURN_LAG_BY_WEEKDAY[day.day()];
  return day.add(lag, "day").format("YYYY-MM-DD");
}

function calculateWindowForRange(eventDate, returnDate, deliveryType) {
  const event = toAuckland(eventDate);
  const back = toAuckland(returnDate);
  const dispatch = isPickup(deliveryType)
    ? PICKUP_DISPATCH_OFFSET_DAYS
    : POST_DISPATCH_OFFSET_BY_WEEKDAY[event.day()];
  const turnaround = isPickup(deliveryType)
    ? PICKUP_TURNAROUND_FROM_RETURN_DAYS
    : POST_TURNAROUND_FROM_RETURN_BY_WEEKDAY[back.day()];

  return {
    blockedFrom: event.subtract(dispatch, "day").format("YYYY-MM-DD"),
    blockedUntil: back.add(turnaround, "day").format("YYYY-MM-DD"),
  };
}

function calculateWindowForEvent(eventDate, deliveryType) {
  return calculateWindowForRange(
    eventDate,
    calculateReturnDate(eventDate, deliveryType),
    deliveryType,
  );
}

// The return date for one stored item.
//
// An existing returnDate always wins. That is what makes a second run safe:
// once the new code is live an admin can choose a return date later than the
// derived one, and re-deriving would silently drag it back and put the dress on
// sale while a customer still has it.
//
// Otherwise `endDate`, where present, was the last day of the rental — so the
// dress falls due the matrix's lag after *it*, not after the event date.
function returnDateForItem(item) {
  if (item.returnDate) return item.returnDate;

  const lastDay =
    item.endDate && item.endDate > item.dateBooked
      ? item.endDate
      : item.dateBooked;
  return calculateReturnDate(lastDay, item.deliveryType);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const bookings = db.collection("bookings");

    const docs = await bookings.find({ items: { $exists: true } }).toArray();

    console.log(
      `Found ${docs.length} booking document(s).${dryRun ? " (dry run — no writes will be made)" : ""}`,
    );

    const planned = [];
    const mismatches = [];
    const repaired = [];
    const unwindowed = [];
    let itemCount = 0;

    for (const doc of docs) {
      const items = doc.items.map((item, index) => {
        itemCount += 1;

        const returnDate = returnDateForItem(item);
        const window = calculateWindowForRange(
          item.dateBooked,
          returnDate,
          item.deliveryType,
        );

        const where = `booking ${doc._id} item ${index} (${item.dateBooked}, ${item.deliveryType})`;

        if (!item.blockedFrom || !item.blockedUntil) {
          // Predates scripts/migrate-booking-windows.js. Nothing to compare
          // against, so the window is filled rather than verified.
          unwindowed.push(where);
        } else {
          // blockedUntil is the figure this migration re-derives, and it is
          // meant to come out identical. A disagreement means the
          // return-anchored tables are wrong, so nothing is written.
          if (item.blockedUntil !== window.blockedUntil) {
            mismatches.push(
              `${where}: stored blockedUntil ${item.blockedUntil}, recomputed ${window.blockedUntil}`,
            );
          }
          // blockedFrom's rule is untouched by this migration — it has always
          // been the dispatch offset applied to dateBooked. A disagreement is
          // therefore a stale stored value, not a bad table: the row's window
          // was computed against dates it no longer has. Repaired rather than
          // aborted on, and listed because until it is, the dress reads as
          // available on days it is already out.
          if (item.blockedFrom !== window.blockedFrom) {
            repaired.push(
              `${where}: blockedFrom ${item.blockedFrom} -> ${window.blockedFrom}`,
            );
          }
        }

        const { endDate, ...rest } = item;
        return { ...rest, returnDate, ...window };
      });

      planned.push({ _id: doc._id, items });
    }

    if (unwindowed.length > 0) {
      console.log(
        `\n${unwindowed.length} item(s) had no stored window and will be filled rather than checked:`,
      );
      for (const line of unwindowed.slice(0, 20)) console.log(`  ${line}`);
      if (unwindowed.length > 20)
        console.log(`  …and ${unwindowed.length - 20} more`);
    }

    // Verified across every item before a single write, so a wrong table can
    // never leave the collection half-migrated.
    if (mismatches.length > 0) {
      console.error(
        `\nABORTING: ${mismatches.length} of ${itemCount} item(s) do not reproduce their stored blockedUntil.`,
      );
      console.error(
        "Re-anchoring turnaround on the return date is meant to be lossless, so this means the tables are wrong. Nothing was written.\n",
      );
      for (const line of mismatches.slice(0, 20)) console.error(`  ${line}`);
      if (mismatches.length > 20)
        console.error(`  …and ${mismatches.length - 20} more`);
      process.exitCode = 1;
      return;
    }

    console.log(
      `\nAll ${itemCount} item(s) reproduce their stored blockedUntil from the new return date.`,
    );

    if (repaired.length > 0) {
      console.log(
        `\n${repaired.length} item(s) had a stale blockedFrom, which ${dryRun ? "would be" : "was"} corrected:`,
      );
      for (const line of repaired) console.log(`  ${line}`);
      console.log(
        "\nEach of these read as available on days the dress was already dispatched.\nCheck for a conflicting booking in the widened window before shipping anything.",
      );
    }

    if (dryRun) {
      console.log(
        `Would update ${planned.length} booking document(s). Sample:`,
      );
      for (const doc of planned.slice(0, 3)) {
        for (const item of doc.items) {
          console.log(
            `  ${doc._id}: ${item.dateBooked} (${item.deliveryType}) → due back ${item.returnDate}, blocked ${item.blockedFrom}→${item.blockedUntil}`,
          );
        }
      }
      return;
    }

    for (const doc of planned) {
      await bookings.updateOne(
        { _id: doc._id },
        { $set: { items: doc.items } },
      );
    }

    console.log(
      `Updated ${itemCount} item(s) across ${planned.length} booking document(s).`,
    );
  } finally {
    await client.close();
  }
}

module.exports = {
  calculateReturnDate,
  calculateWindowForEvent,
  calculateWindowForRange,
  returnDateForItem,
};

if (require.main === module) {
  main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
