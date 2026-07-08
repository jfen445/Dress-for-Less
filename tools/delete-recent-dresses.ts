/**
 * Deletes all dress documents created in the last hour.
 * Run: npx tsx tools/delete-recent-dresses.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@sanity/client";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length)
      process.env[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
}

const token = process.env.SANITY_API_TOKEN;
if (!token) {
  console.error("Missing SANITY_API_TOKEN in .env.local");
  process.exit(1);
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-03-16",
  useCdn: false,
  token,
});

async function main() {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const docs = await client.fetch<{ _id: string; name: string }[]>(
    `*[_type == "dress" && _createdAt > $since]{ _id, name }`,
    { since }
  );

  if (!docs.length) {
    console.log("No dresses created in the last hour.");
    return;
  }

  console.log(`Found ${docs.length} dress(es) to delete:`);
  docs.forEach((d) => console.log(`  ${d._id} — ${d.name}`));

  const tx = client.transaction();
  docs.forEach((d) => tx.delete(d._id));
  await tx.commit();

  console.log("Done — all deleted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
