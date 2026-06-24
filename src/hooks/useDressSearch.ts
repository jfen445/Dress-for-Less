import { useState } from "react";
import { DressType } from "../../common/types";

export function useDressSearch(allDresses: DressType[]) {
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults =
    searchQuery.trim().length > 0
      ? allDresses
          .filter((d) => {
            const q = searchQuery.toLowerCase();
            return (
              d.name?.toLowerCase().includes(q) ||
              d.brand?.toLowerCase().includes(q) ||
              d.description?.toLowerCase().includes(q)
            );
          })
          .slice(0, 8)
      : [];

  return { searchQuery, setSearchQuery, searchResults };
}
