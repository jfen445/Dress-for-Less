/**
 * Import dresses from dress-import.csv into Sanity.
 *
 * Setup:
 *   1. Add SANITY_API_TOKEN to .env.local (needs "Editor" or "Administrator" role)
 *      Get it from: https://www.sanity.io/manage → project → API → Tokens
 *   2. Run: npx tsx tools/import-dresses.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@sanity/client";

// Load .env.local
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

console.log(
  "NEXT_PUBLIC_SANITY_PROJECT_ID:",
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
);
console.log(
  "NEXT_PUBLIC_SANITY_DATASET:",
  process.env.NEXT_PUBLIC_SANITY_DATASET,
);
console.log(
  "SANITY_API_TOKEN:",
  process.env.SANITY_API_TOKEN ? "[set]" : "[missing]",
);

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-03-16",
  useCdn: false,
  token,
});

// Minimal CSV parser that handles double-quoted fields containing commas
function parseCsv(raw: string): Record<string, string>[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const headers = parseRow(lines[0]);
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = values[idx] ?? ""));
    results.push(row);
  }

  return results;
}

function parseRow(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

function toNum(val: string): number | undefined {
  const n = Number(val);
  return isNaN(n) || val.trim() === "" ? undefined : n;
}

const TAG_MAP: Record<string, string> = {
  "Birthday": "birthday",
  "Wedding Guest": "wedding_guest",
  "Cocktail": "cocktail",
  "Day Events": "day_events",
  "Ball": "ball",
  "Graduation": "graduation",
  "Black Tie": "black_tie",
  "Festival": "festival",
  "Black": "black",
  "White": "white",
  "Red": "red",
  "Orange": "orange",
  "Yellow": "yellow",
  "Green": "green",
  "Blue": "blue",
  "Purple": "purple",
  "Pink": "pink",
  "Grey": "grey",
  "Brown": "brown",
  "Multicolour": "multicolour",
  "Mini": "mini",
  "Midi": "midi",
  "Maxi": "maxi",
  "Sets": "sets",
  "Off-the-Shoulder": "off_the_shoulder",
  "Sleeveless": "sleeveless",
  "Short sleeve": "short_sleeve",
  "Long sleeve": "long_sleeve",
  "Trending Now": "trending_now",
  "New Arrivals": "new_arrivals",
  "Customer Faves": "customer_faves",
  "Holiday": "holiday",
  "Race Day": "race_day",
  "Strapless": "strapless",
};

function toArr(val: string): string[] {
  return val
    ? val
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

function toTags(val: string): string[] {
  return toArr(val).map((t) => TAG_MAP[t] ?? t);
}

const IMAGES_DIR = path.resolve(process.cwd(), "tools/images");

async function uploadImages(folder: string): Promise<
  { _type: "image"; _key: string; asset: { _type: "reference"; _ref: string } }[]
> {
  const folderPath = path.join(IMAGES_DIR, folder);
  if (!fs.existsSync(folderPath)) {
    console.warn(`  Image folder not found, skipping: ${folder}`);
    return [];
  }
  const files = fs.readdirSync(folderPath).filter((f) =>
    /\.(jpe?g|png|webp|gif)$/i.test(f)
  );
  if (!files.length) {
    console.warn(`  No images found in folder: ${folder}`);
    return [];
  }
  const results = [];
  for (const filename of files) {
    const filePath = path.join(folderPath, filename);
    const asset = await client.assets.upload(
      "image",
      fs.createReadStream(filePath),
      { filename }
    );
    console.log(`  Uploaded: ${folder}/${filename} → ${asset._id}`);
    results.push({
      _type: "image" as const,
      _key: asset._id,
      asset: { _type: "reference" as const, _ref: asset._id },
    });
  }
  return results;
}

async function main() {
  const csvPath = path.resolve(process.cwd(), "dress-import.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("dress-import.csv not found in project root");
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(csvPath, "utf-8"));
  console.log(`Found ${rows.length} dress(es) to import`);

  for (const row of rows) {
    const doc: { _type: string } & Record<string, unknown> = {
      _type: "dress",
      name: row.name,
    };

    if (row.description) doc.description = row.description;
    if (row.brand) doc.brand = row.brand;
    if (row.condition) doc.condition = row.condition;
    if (row.notes) doc.notes = row.notes;
    if (row.length) doc.length = row.length;
    if (row.stretch) doc.stretch = row.stretch;

    const price = toNum(row.price);
    if (price !== undefined) doc.price = price;

    const rrp = toNum(row.rrp);
    if (rrp !== undefined) doc.rrp = rrp;

    const xs = toNum(row.xs);
    if (xs !== undefined) doc.xs = xs;
    const s = toNum(row.s);
    if (s !== undefined) doc.s = s;
    const m = toNum(row.m);
    if (m !== undefined) doc.m = m;
    const l = toNum(row.l);
    if (l !== undefined) doc.l = l;
    const xl = toNum(row.xl);
    if (xl !== undefined) doc.xl = xl;

    const recommendedSize = toArr(row.recommendedSize);
    if (recommendedSize.length) doc.recommendedSize = recommendedSize;

    const tags = toTags(row.tags);
    if (tags.length) doc.tags = tags;

    if (row.images) {
      doc.images = await uploadImages(row.images.trim());
    }

    const created = await client.create(doc);
    console.log(`Created: ${created._id} — ${row.name}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
