// Rebuilds the TryOnBookings slot-uniqueness index against a live database.
//
// The index on { date, timeSlot } used to be partial — scoped to
// paymentSuccess: true — because try-on used to charge first and write the row
// afterwards, so only paid rows existed. That scoping is exactly what let two
// customers pay for the same appointment: both passed the availability read,
// both were charged, and the index refused only the second *write*, after both
// cards had been hit.
//
// The reserve step now writes an unpaid row before the card is touched, so the
// constraint has to cover every row. Then the insert itself decides the race and
// the loser is stopped with nothing charged.
//
// Mongoose connects with autoIndex disabled outside development (see
// lib/db/db.ts), so declaring the index in the schema does nothing in
// production — it has to be created explicitly, which is what this does. For the
// same reason the old partial index may never have been built in production at
// all; this script handles it being present or absent.
//
// Usage:
//   node --env-file=.env.local scripts/migrate-tryon-slot-index.js --dry-run
//   node --env-file=.env.local scripts/migrate-tryon-slot-index.js
//
// Safe to re-run — it reports and exits when the index is already correct.

const { MongoClient } = require("mongodb");

const DRY_RUN = process.argv.includes("--dry-run");
const INDEX_NAME = "date_1_timeSlot_1";

// Mongo will not build a unique index over existing duplicates, and the error it
// returns names only one offending value. Finding them all up front is the
// difference between "fix these two slots" and guessing one at a time.
//
// Unscoped, deliberately: the new index covers every row, so duplicates among
// unpaid rows block the build just as paid ones do.
async function findDuplicateSlots(tryOnBookings) {
  return tryOnBookings
    .aggregate([
      {
        $group: {
          _id: { date: "$date", timeSlot: "$timeSlot" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
}

function isAlreadyCorrect(index) {
  return (
    index &&
    index.unique === true &&
    index.partialFilterExpression === undefined &&
    index.key &&
    index.key.date === 1 &&
    index.key.timeSlot === 1
  );
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing environment variable: "MONGODB_URI"');

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const tryOnBookings = db.collection("tryonbookings");

    const existing = await tryOnBookings.indexes();
    console.log(
      `Existing TryOnBookings indexes: ${existing.map((i) => i.name).join(", ")}` +
        (DRY_RUN ? "\n(dry run — nothing will be changed)" : ""),
    );

    const current = existing.find((i) => i.name === INDEX_NAME);

    if (isAlreadyCorrect(current)) {
      console.log(`✓ ${INDEX_NAME} is already unique over every row — nothing to do.`);
      return;
    }

    const duplicates = await findDuplicateSlots(tryOnBookings);

    if (duplicates.length > 0) {
      console.error(
        `\n✗ Cannot build ${INDEX_NAME}: ${duplicates.length} slot(s) already have more than one booking.`,
      );
      for (const dup of duplicates) {
        console.error(
          `    ${dup._id.date} ${dup._id.timeSlot} × ${dup.count} → ${dup.ids.join(", ")}`,
        );
      }
      console.error(
        "  Resolve these by hand before re-running — two rows on one slot means two customers\n" +
          "  were sold the same appointment, and which of them keeps it is a judgement call, not a\n" +
          "  script's. This is the bug the new index exists to prevent.",
      );
      process.exitCode = 1;
      return;
    }

    if (DRY_RUN) {
      console.log(
        current
          ? `[dry run] would drop the partial ${INDEX_NAME} and rebuild it unique over every row`
          : `[dry run] would create ${INDEX_NAME} unique on { date, timeSlot }`,
      );
      return;
    }

    // Same key pattern, different options — the old one has to go before the new
    // one can be built under that name.
    if (current) {
      await tryOnBookings.dropIndex(INDEX_NAME);
      console.log(`✓ Dropped the old partial ${INDEX_NAME}.`);
    }

    await tryOnBookings.createIndex(
      { date: 1, timeSlot: 1 },
      { unique: true, name: INDEX_NAME },
    );
    console.log(`✓ Created ${INDEX_NAME} unique on { date, timeSlot }.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
