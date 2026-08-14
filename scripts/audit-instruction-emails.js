// Audit: which bookings claim an instruction email that was never actually
// sent? Read-only — it performs no writes of any kind.
//
// Until instructionsEmailIds existed, sendBookingEmails stamped
// instructionsSentAt whenever the Resend call *resolved*. Resend's client
// resolves with an { error } object instead of throwing, so a rejected send
// (rate limit, unverified domain, quota) marked the booking as emailed
// anyway. Those stamps carry no message id, so the only way to tell a real
// send from a false one is to compare them against Resend's own record.
//
// Bookings emailed after instructionsEmailIds shipped don't need this: their
// ids can be fed straight to resend.emails.get(id).
//
// Usage:
//   node --env-file=.env.local scripts/audit-instruction-emails.js
//   node --env-file=.env.local scripts/audit-instruction-emails.js --db=production
//   node --env-file=.env.local scripts/audit-instruction-emails.js --missing-only
//
// MONGODB_URI here carries no database path, so it defaults to "test" — pass
// --db=production to audit live data.

const { MongoClient } = require("mongodb");

const RESEND_API = "https://api.resend.com/emails";

// Subjects from src/components/Emails/BookingInstructions (getBookingInstructionsSubject).
// Keep in step with that file, or previously sent emails stop being recognised.
const INSTRUCTION_SUBJECTS = new Set([
  "Your Dress for Less rental is ready for pickup tomorrow 💌",
  "Your Dress for Less order is on its way 💌",
]);

// A stamp is written just after its batch's sends, so an email belongs to it
// if it was created shortly before. Wide on the early side to tolerate slow
// batches, tight on the late side so the next batch isn't swallowed.
const WINDOW_BEFORE_MS = 30 * 60 * 1000;
const WINDOW_AFTER_MS = 2 * 60 * 1000;

const DB_NAME = process.argv
  .find((arg) => arg.startsWith("--db="))
  ?.split("=")[1];
const MISSING_ONLY = process.argv.includes("--missing-only");

// "2026-08-14 13:13:54.558000+00" -> epoch ms
function parseResendDate(value) {
  return Date.parse(
    value
      .replace(" ", "T")
      .replace(/(\.\d{3})\d+/, "$1")
      .replace(/\+00$/, "Z"),
  );
}

// Resend paginates with an `after=<id>` cursor. The v4 SDK exposes no list
// endpoint, so this goes to the REST API directly.
async function fetchAllEmails(apiKey) {
  const all = [];
  let after = null;

  for (;;) {
    const url = new URL(RESEND_API);
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok)
      throw new Error(
        `Resend list failed: ${response.status} ${await response.text()}`,
      );

    const { data, has_more: hasMore } = await response.json();
    if (!data?.length) break;

    all.push(...data);
    if (!hasMore) break;
    after = data[data.length - 1].id;
  }

  return all;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY environment variable");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = DB_NAME ? client.db(DB_NAME) : client.db();

    const bookings = await db
      .collection("bookings")
      .aggregate([
        { $match: { instructionsSentAt: { $exists: true, $ne: null } } },
        {
          $lookup: {
            from: "allusers",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $project: {
            orderNumber: 1,
            instructionsSentAt: 1,
            instructionsEmailIds: 1,
            "items.dateBooked": 1,
            "user.email": 1,
          },
        },
        { $sort: { instructionsSentAt: 1 } },
      ])
      .toArray();

    if (bookings.length === 0) {
      console.log(`\nNo stamped bookings in "${db.databaseName}". Nothing to audit.`);
      return;
    }

    const emails = await fetchAllEmails(apiKey);
    const instructionEmails = emails.filter((email) =>
      INSTRUCTION_SUBJECTS.has(email.subject),
    );

    console.log(`\nDatabase: ${db.databaseName}`);
    console.log(
      `Resend:   ${emails.length} emails, ${instructionEmails.length} instruction emails`,
    );
    console.log(`Mongo:    ${bookings.length} bookings stamped as emailed`);

    // A stamp older than Resend's retained history can't be judged either way,
    // and would otherwise be reported as a false stamp.
    const oldestRetained = Math.min(
      ...emails.map((email) => parseResendDate(email.created_at)),
    );
    const unverifiable = bookings.filter(
      (booking) => booking.instructionsSentAt.getTime() < oldestRetained,
    );
    if (unverifiable.length > 0)
      console.log(
        `\n⚠ ${unverifiable.length} stamp(s) predate Resend's retained history ` +
          `(${new Date(oldestRetained).toISOString()}) and cannot be checked.`,
      );

    // One Resend email accounts for exactly one booking. Without this, a
    // customer with two bookings in a batch would have both marked sent off a
    // single email, hiding a real miss.
    const consumed = new Set();
    const missing = [];
    const found = [];

    for (const booking of bookings) {
      if (unverifiable.includes(booking)) continue;

      const recipient = booking.user?.[0]?.email?.toLowerCase();
      const stamp = booking.instructionsSentAt.getTime();

      const matches = instructionEmails
        .filter((email) => {
          if (consumed.has(email.id)) return false;
          if (!email.to?.some((to) => to.toLowerCase() === recipient))
            return false;
          const sentAt = parseResendDate(email.created_at);
          return (
            sentAt >= stamp - WINDOW_BEFORE_MS &&
            sentAt <= stamp + WINDOW_AFTER_MS
          );
        })
        .sort(
          (a, b) =>
            Math.abs(parseResendDate(a.created_at) - stamp) -
            Math.abs(parseResendDate(b.created_at) - stamp),
        )
        // One email per item, since the route sends per item.
        .slice(0, Math.max(1, (booking.items ?? []).length));

      for (const match of matches) consumed.add(match.id);

      const row = {
        orderNumber: booking.orderNumber ?? "(none)",
        id: booking._id.toString(),
        recipient,
        stamp: booking.instructionsSentAt.toISOString(),
        rentals: [
          ...new Set((booking.items ?? []).map((item) => item.dateBooked)),
        ].join(", "),
        events: matches.map((match) => match.last_event),
        // Distinguishes "never sent" from "sent outside the matching window",
        // e.g. a manual re-send long after the stamp.
        sentAtSomeOtherTime: instructionEmails.some((email) =>
          email.to?.some((to) => to.toLowerCase() === recipient),
        ),
      };

      (matches.length === 0 ? missing : found).push(row);
    }

    console.log(`\n✅ ${found.length} stamped booking(s) match a Resend email`);
    console.log(`❌ ${missing.length} stamped booking(s) match nothing\n`);

    if (missing.length > 0) {
      console.log("── NEVER ACTUALLY SENT ──────────────────────────────");
      for (const row of missing)
        console.log(
          `  ${row.orderNumber}  ${row.id}  rental ${row.rentals}  ` +
            `stamped ${row.stamp}  ${row.recipient}` +
            (row.sentAtSomeOtherTime
              ? "   (has an instruction email at another time)"
              : ""),
        );
      console.log(
        `\n  To re-send, clear the stamp so /admin stops greying them out:\n` +
          `  db.bookings.updateMany(\n` +
          `    { orderNumber: { $in: [${missing.map((r) => `"${r.orderNumber}"`).join(", ")}] } },\n` +
          `    { $unset: { instructionsSentAt: "" } }\n  )\n`,
      );
    }

    if (MISSING_ONLY) return;

    const undelivered = found.filter((row) =>
      row.events.some((event) =>
        ["bounced", "complained", "canceled", "suppressed"].includes(event),
      ),
    );
    if (undelivered.length > 0) {
      console.log("── SENT BUT DID NOT LAND ────────────────────────────");
      for (const row of undelivered)
        console.log(
          `  ${row.orderNumber}  rental ${row.rentals}  ${row.recipient}  [${row.events.join(", ")}]`,
        );
      console.log("");
    }

    const tally = {};
    for (const row of found)
      for (const event of row.events) tally[event] = (tally[event] ?? 0) + 1;
    console.log("Delivery events across matched emails:", tally);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
