import React from "react";
import { getBookingCutoffs } from "@/api/dress";
import type { CutoffOverride } from "../../lib/utils/deliveryRules";

// Admin cut-off overrides, shared at module scope so the Calendar, cart and
// checkout cost one request between them. Refetched once a minute at most, to
// match the route's cache.
//
// `overrides` is null until loaded, and stays null if the fetch fails: callers
// must treat that as "can't tell yet" and not book, because evaluating with an
// empty list would ignore an override that has closed a date.

const MAX_AGE_MS = 60_000;

let cached: { overrides: CutoffOverride[]; at: number } | null = null;
let inFlight: Promise<CutoffOverride[] | null> | null = null;

const loadCutoffs = () => {
  if (cached && Date.now() - cached.at < MAX_AGE_MS) {
    return Promise.resolve(cached.overrides);
  }
  if (inFlight) return inFlight;

  inFlight = getBookingCutoffs()
    .then(({ data }) => {
      cached = { overrides: (data ?? []) as CutoffOverride[], at: Date.now() };
      return cached.overrides;
    })
    .catch((error) => {
      console.error(error);
      return cached?.overrides ?? null;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export default function useBookingCutoffs() {
  const [overrides, setOverrides] = React.useState<CutoffOverride[] | null>(
    cached?.overrides ?? null,
  );

  React.useEffect(() => {
    let cancelled = false;
    loadCutoffs().then((loaded) => {
      if (!cancelled && loaded) setOverrides(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return overrides;
}
