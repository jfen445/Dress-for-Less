import { useEffect, useState } from "react";
import { DressType } from "../../common/types";
import { searchDresses } from "@/api/dress";

const DEBOUNCE_MS = 250;

export function useDressSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DressType[]>([]);

  // This used to filter the whole catalogue in memory, which meant the nav —
  // rendered on every page — dragged all ~600 dresses along with it. Searching
  // server-side costs one small request per pause in typing instead, and it
  // keeps working as the catalogue grows.
  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length === 0) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      searchDresses(term)
        .then(({ data }) => {
          if (!cancelled) setSearchResults((data ?? []) as DressType[]);
        })
        .catch((error) => {
          console.error(error);
          if (!cancelled) setSearchResults([]);
        });
    }, DEBOUNCE_MS);

    return () => {
      // Covers both halves: cancels a keystroke that never settled, and stops a
      // slow answer for an earlier term landing over a later one's results.
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  return { searchQuery, setSearchQuery, searchResults };
}
