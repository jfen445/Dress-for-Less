/**
 * Deletes ALL dress documents in Sanity.
 * Run: npx tsx tools/delete-all-dresses.ts
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
  const docs = await client.fetch<{ _id: string; name: string }[]>(
    `*[_type == "dress"]{ _id, name }`
  );

  if (!docs.length) {
    console.log("No dresses found.");
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
