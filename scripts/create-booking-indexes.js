// Builds the Bookings indexes declared in lib/db/schema.ts against a live
// database. Mongoose connects with autoIndex disabled outside development (see
// lib/db/db.ts), so declaring an index in the schema does nothing in
// production — it has to be created explicitly, which is what this does.
//
// The one that matters is the unique index on paymentIntent. Checkout's reserve
// step upserts on { paymentIntent }, and two requests carrying the same intent
// can both miss the find and both insert; the unique index is what makes the
// second one fail instead of quietly producing a second row that holds stock.
//
// Usage:
//   node --env-file=.env.local scripts/create-booking-indexes.js --dry-run
//   node --env-file=.env.local scripts/create-booking-indexes.js
//
// Safe to re-run — createIndex is a no-op when the index already exists with
// the same definition.

const { MongoClient } = require("mongodb");

const DRY_RUN = process.argv.includes("--dry-run");

const INDEXES = [
  {
    name: "paymentIntent_1",
    keys: { paymentIntent: 1 },
    // Scoped to rows checkout reserved. Admin-created bookings deliberately all
    // share the literal "ADMIN_MANUAL" and legacy rows predate the scheme;
    // neither carries reservedAt, so neither is covered — nor should be, since
    // paymentIntent isn't a key for them.
    options: {
      unique: true,
      partialFilterExpression: { reservedAt: { $exists: true } },
    },
    uniqueOn: "paymentIntent",
    scope: { reservedAt: { $exists: true } },
  },
  {
    name: "orderNumber_1",
    keys: { orderNumber: 1 },
    // Sparse: bookings predating the order-number scheme have none until
    // scripts/migrate-order-numbers.js runs, and a unique non-sparse index
    // would reject all but one of them.
    options: { unique: true, sparse: true },
    uniqueOn: "orderNumber",
    scope: { orderNumber: { $nin: [null, ""] } },
  },
];

// A unique index refuses to build over existing duplicates, and the error
// Mongo returns names only one offending value. Finding them all up front is
// the difference between "fix these three bookings" and guessing one at a time.
//
// `scope` must mirror the index's own partialFilterExpression/sparse setting —
// checking duplicates across rows the index won't cover would block a build
// that would in fact succeed.
async function findDuplicates(bookings, field, scope) {
  return bookings
    .aggregate([
      { $match: scope },
      { $group: { _id: `$${field}`, count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing environment variable: "MONGODB_URI"');

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const bookings = db.collection("bookings");

    const existing = await bookings.indexes();
    const existingNames = new Set(existing.map((index) => index.name));

    console.log(
      `Existing Bookings indexes: ${existing.map((i) => i.name).join(", ")}` +
        (DRY_RUN ? "\n(dry run — no indexes will be created)" : ""),
    );

    let blocked = false;

    for (const index of INDEXES) {
      if (existingNames.has(index.name)) {
        console.log(`✓ ${index.name} already exists — nothing to do.`);
        continue;
      }

      const duplicates = await findDuplicates(
        bookings,
        index.uniqueOn,
        index.scope,
      );

      if (duplicates.length > 0) {
        blocked = true;
        console.error(
          `\n✗ Cannot build ${index.name}: ${duplicates.length} duplicate ${index.uniqueOn} value(s) already in the collection.`,
        );
        for (const dup of duplicates) {
          console.error(
            `    ${index.uniqueOn}=${dup._id} × ${dup.count} → ${dup.ids.join(", ")}`,
          );
        }
        console.error(
          `  Resolve these by hand before re-running — a duplicate ${index.uniqueOn} means two booking rows\n` +
            "  share one payment, and which of them is the real booking is a judgement call, not a script's.",
        );
        continue;
      }

      if (DRY_RUN) {
        console.log(`[dry run] would create ${index.name} on ${JSON.stringify(index.keys)}`);
        continue;
      }

      await bookings.createIndex(index.keys, {
        ...index.options,
        name: index.name,
      });
      console.log(`✓ Created ${index.name} on ${JSON.stringify(index.keys)}.`);
    }

    if (blocked) {
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Index creation failed:", err);
  process.exit(1);
});
