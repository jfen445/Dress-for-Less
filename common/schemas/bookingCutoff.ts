import { defineField } from "sanity";

// Every half hour, 00:00–23:30. A fixed list rather than free text so a cut-off
// can never be an unparseable time.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hh = String(Math.floor(i / 2)).padStart(2, "0");
  return `${hh}:${i % 2 ? "30" : "00"}`;
});

// A date plus a wall-clock time, read in Pacific/Auckland by
// lib/utils/deliveryRules.ts. Deliberately not a Sanity `datetime`, which would
// convert through the editor's browser timezone.
const cutoffField = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: "object",
    description:
      "Last moment to book (NZ local time). Leave blank to use the normal cut-off for this method.",
    options: { columns: 2 },
    fields: [
      defineField({ name: "date", title: "Date", type: "date" }),
      defineField({
        name: "time",
        title: "Time (NZ local)",
        type: "string",
        options: { list: TIME_OPTIONS, layout: "dropdown" },
        initialValue: "20:00",
      }),
    ],
    // The time defaults to 20:00 on a fresh document, so a time with no date
    // counts as blank — the date is what switches the override on.
    validation: (rule) =>
      rule.custom((value: { date?: string; time?: string } | undefined) =>
        !value?.date || value.time ? true : "Set a time",
      ),
  });

type CutoffDoc = {
  _id?: string;
  startDate?: string;
  endDate?: string;
  deliveryCutoff?: { date?: string };
  pickupCutoff?: { date?: string };
};

const bookingCutoff = {
  name: "bookingCutoff",
  title: "Booking Cut-off",
  type: "document",
  description:
    "Overrides the normal booking cut-off for rental event dates in a range. Most specific (shortest) range wins where entries overlap.",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Internal only, e.g. \"Christmas closure\"",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "startDate",
      title: "First event date",
      type: "date",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "endDate",
      title: "Last event date",
      type: "date",
      description: "Leave blank for a single day",
      validation: (rule) =>
        rule.custom((endDate: string | undefined, context) => {
          const start = (context.document as CutoffDoc | undefined)?.startDate;
          return !endDate || !start || endDate >= start
            ? true
            : "Must be on or after the first event date";
        }),
    }),
    cutoffField("deliveryCutoff", "Delivery cut-off"),
    cutoffField("pickupCutoff", "Pickup cut-off"),
  ],
  validation: (rule: any) => [
    rule.custom((doc: CutoffDoc | undefined) =>
      doc?.deliveryCutoff?.date || doc?.pickupCutoff?.date
        ? true
        : "Set a Delivery cut-off, a Pickup cut-off, or both",
    ),
    // Overlaps are allowed (that is how an exception is carved out of a longer
    // period) but worth a second look, so this warns rather than blocks.
    rule
      .custom(async (doc: CutoffDoc | undefined, context: any) => {
        if (!doc?.startDate) return true;
        const id = (doc._id ?? "").replace(/^drafts\./, "");
        const overlapping: string[] = await context
          .getClient({ apiVersion: "2024-03-16" })
          .fetch(
            `*[_type == "bookingCutoff" && !(_id in path("drafts.**")) && _id != $id
               && startDate <= $end && coalesce(endDate, startDate) >= $start].title`,
            { id, start: doc.startDate, end: doc.endDate ?? doc.startDate },
          );
        return overlapping.length === 0
          ? true
          : `Overlaps ${overlapping.join(", ")} — the shorter range wins for each method`;
      })
      .warning(),
  ],
  preview: {
    select: { title: "title", startDate: "startDate", endDate: "endDate" },
    prepare: ({ title, startDate, endDate }: CutoffDoc & { title?: string }) => ({
      title,
      subtitle:
        endDate && endDate !== startDate ? `${startDate} → ${endDate}` : startDate,
    }),
  },
};

export default bookingCutoff;
