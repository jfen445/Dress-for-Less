// One-off migration: backfill a unique orderNumber (e.g. "DFL-0001") onto
// every existing Booking document created before this scheme existed. New
// bookings get their orderNumber assigned atomically at creation time via
// lib/utils/orderNumber.ts (getNextOrderNumber) against the "counters"
// collection — this script seeds that counter so future numbers continue
// after the highest one assigned here.
//
// Usage:
//   node --env-file=.env.local scripts/migrate-order-numbers.js --dry-run
//   node --env-file=.env.local scripts/migrate-order-numbers.js
//
// Safe to re-run — only assigns numbers to documents that don't already
// have one, and re-seeds the counter to the current max either way.

const { MongoClient } = require("mongodb");

const ORDER_NUMBER_COUNTER_ID = "bookingOrderNumber";
const ORDER_NUMBER_BASE_SEQ = 0;
const ORDER_NUMBER_PAD_LENGTH = 4;
const DRY_RUN = process.argv.includes("--dry-run");

function parseSeq(orderNumber) {
  const match = /^DFL-(\d+)$/.exec(orderNumber ?? "");
  return match ? parseInt(match[1], 10) : null;
}

function formatOrderNumber(seq) {
  return `DFL-${String(seq).padStart(ORDER_NUMBER_PAD_LENGTH, "0")}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const bookings = db.collection("bookings");
    const counters = db.collection("counters");

    const existingCounter = await counters.findOne({
      _id: ORDER_NUMBER_COUNTER_ID,
    });

    const allBookings = await bookings
      .find({}, { projection: { orderNumber: 1, createdAt: 1 } })
      .sort({ createdAt: 1 })
      .toArray();

    const highestExistingSeq = allBookings.reduce((max, doc) => {
      const seq = parseSeq(doc.orderNumber);
      return seq !== null && seq > max ? seq : max;
    }, existingCounter?.seq ?? ORDER_NUMBER_BASE_SEQ);

    const toBackfill = allBookings.filter((doc) => !doc.orderNumber);

    console.log(
      `Found ${allBookings.length} booking document(s), ${toBackfill.length} missing an orderNumber.` +
        (DRY_RUN ? " (dry run — no writes will be made)" : ""),
    );

    let seq = highestExistingSeq;

    for (const doc of toBackfill) {
      seq += 1;
      const orderNumber = formatOrderNumber(seq);

      if (DRY_RUN) {
        console.log(`[dry run] booking ${doc._id}: would set orderNumber ${orderNumber}`);
        continue;
      }

      await bookings.updateOne({ _id: doc._id }, { $set: { orderNumber } });
    }

    console.log(
      `${DRY_RUN ? "Would assign" : "Assigned"} orderNumber to ${toBackfill.length} booking document(s).`,
    );

    if (DRY_RUN) {
      console.log(`[dry run] would seed counter "${ORDER_NUMBER_COUNTER_ID}" to seq ${seq}`);
    } else {
      await counters.updateOne(
        { _id: ORDER_NUMBER_COUNTER_ID },
        { $set: { seq } },
        { upsert: true },
      );
      console.log(`Seeded counter "${ORDER_NUMBER_COUNTER_ID}" to seq ${seq}.`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
