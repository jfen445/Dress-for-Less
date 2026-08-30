import React from "react";
import { DressType } from "../../common/types";
import { getCatalogue } from "@/api/dress";

// The whole ~600-dress catalogue, for the only screens that genuinely need
// every dress at once: the admin tables and pickers. Everything customer-facing
// resolves a dress by id (GlobalContext.getDressById) or a page at a time
// (/api/sanity/listing), so nothing else should reach for this.
//
// Module scope rather than context state, because the four admin components
// that want it mount together and would otherwise each fetch their own copy —
// and because putting it in a provider means mounting it on every route in the
// app to serve one route that is behind middleware.

let catalogue: DressType[] | null = null;
let inFlight: Promise<DressType[]> | null = null;

const loadCatalogue = () => {
  if (catalogue) return Promise.resolve(catalogue);
  if (inFlight) return inFlight;

  inFlight = getCatalogue()
    .then(({ data }) => {
      catalogue = (data ?? []) as DressType[];
      return catalogue;
    })
    .catch((error) => {
      // Leave `catalogue` null so a later mount can try again, rather than
      // pinning an empty list for the rest of the session.
      console.error(error);
      return [] as DressType[];
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export default function useAllDresses() {
  const [allDresses, setAllDresses] = React.useState<DressType[]>(
    catalogue ?? [],
  );
  const [allDressesLoaded, setAllDressesLoaded] = React.useState(
    catalogue !== null,
  );

  React.useEffect(() => {
    let cancelled = false;

    loadCatalogue().then((dresses) => {
      if (cancelled) return;
      setAllDresses(dresses);
      setAllDressesLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { allDresses, allDressesLoaded };
}
