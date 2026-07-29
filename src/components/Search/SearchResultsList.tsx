"use client";

import Link from "next/link";
import Image from "next/image";
import { DressType } from "../../../common/types";
import { sizedImageUrl } from "../../../sanity/lib/image";

interface Props {
  results: DressType[];
  onSelect: () => void;
  emptyQuery?: boolean;
}

const SearchResultsList = ({ results, onSelect, emptyQuery }: Props) => {
  if (emptyQuery) return null;

  if (results.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-gray-500">No dresses found</p>
    );
  }

  return (
    <ul>
      {results.map((dress) => (
        <li key={dress._id}>
          <Link
            href={`/dresses/products/${dress._id}`}
            onClick={onSelect}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
          >
            <Image
              src={sizedImageUrl(dress.images[0], { width: 80 })}
              alt={dress.name}
              width={40}
              height={56}
              className="h-14 w-10 flex-shrink-0 object-cover rounded"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {dress.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{dress.brand}</p>
              <p className="text-xs text-gray-500">${dress.price}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default SearchResultsList;
