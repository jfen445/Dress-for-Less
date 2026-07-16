// One-off migration: convert legacy flat Bookings documents (one dress per
// document, grouped only by a shared `paymentIntent` string) into the new
// nested shape (one document per order, with an `items` array).
//
// Usage:
//   node --env-file=.env.local scripts/migrate-bookings-to-items.js --dry-run
//   node --env-file=.env.local scripts/migrate-bookings-to-items.js
//
// Run with --dry-run first and review the output. Take a database backup/
// snapshot before running for real — this deletes and rewrites documents in
// the `bookings` collection and is not wrapped in a transaction (so a
// mid-run failure can leave the migration partially applied; it is safe to
// re-run, since already-migrated documents — those with an `items` field —
// are skipped).

const { MongoClient, ObjectId } = require("mongodb");

const DRY_RUN = process.argv.includes("--dry-run");

// Every admin-manually-created booking shares this literal paymentIntent
// (see pages/api/admin/bookings.ts POST) — it is not a real grouping key,
// so each such document must become its own standalone order.
const ADMIN_MANUAL_PAYMENT_INTENT = "ADMIN_MANUAL";

function buildNewBooking(docs) {
  const first = docs[0];

  const items = docs.map((d) => ({
    _id: new ObjectId(),
    dressId: d.dressId,
    dateBooked: d.dateBooked,
    blockOutPeriod: d.blockOutPeriod ?? [],
    deliveryType: d.deliveryType ?? "delivery",
    ...(d.address ? { address: d.address } : {}),
    size: d.size,
    price: d.price,
    instructions: d.instructions ?? "",
  }));

  const totalPrice =
    items.reduce((sum, item) => sum + (item.price ?? 0), 0) -
    (first.discountAmount ?? 0);

  return {
    _id: first._id,
    userId: first.userId,
    items,
    totalPrice,
    billingAddress: first.billingAddress ?? {},
    tracking: first.tracking ?? "",
    isShipped: first.isShipped ?? false,
    isReturned: first.isReturned ?? false,
    paymentIntent: first.paymentIntent,
    paymentSuccess: first.paymentSuccess ?? false,
    status: first.status,
    couponIds: first.couponIds ?? [],
    discountAmount: first.discountAmount ?? 0,
    createdAt: first.createdAt,
    updatedAt: new Date(),
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

    const legacyDocs = await bookings
      .find({ items: { $exists: false } })
      .toArray();

    if (legacyDocs.length === 0) {
      console.log("No legacy bookings found. Nothing to migrate.");
      return;
    }

    const groups = new Map();
    for (const doc of legacyDocs) {
      const isStandalone =
        !doc.paymentIntent || doc.paymentIntent === ADMIN_MANUAL_PAYMENT_INTENT;
      const key = isStandalone ? `__standalone_${doc._id}` : doc.paymentIntent;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(doc);
    }

    console.log(
      `Found ${legacyDocs.length} legacy booking document(s) across ${groups.size} order(s).${DRY_RUN ? " (dry run — no writes will be made)" : ""}`,
    );

    let migratedOrders = 0;

    for (const [paymentIntent, docs] of groups) {
      const newBooking = buildNewBooking(docs);
      const idsToRemove = docs
        .map((d) => d._id)
        .filter((id) => !id.equals(newBooking._id));

      if (DRY_RUN) {
        console.log(
          `[dry run] order ${paymentIntent}: would merge ${docs.length} document(s) into booking ${newBooking._id} with ${newBooking.items.length} item(s), totalPrice=${newBooking.totalPrice}`,
        );
        migratedOrders += 1;
        continue;
      }

      if (idsToRemove.length > 0) {
        await bookings.deleteMany({ _id: { $in: idsToRemove } });
      }
      await bookings.replaceOne({ _id: newBooking._id }, newBooking, {
        upsert: true,
      });

      migratedOrders += 1;
    }

    console.log(
      `${DRY_RUN ? "Would migrate" : "Migrated"} ${migratedOrders} order(s) from ${legacyDocs.length} legacy document(s).`,
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
