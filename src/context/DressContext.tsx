import React from "react";
import { useRouter } from "next/router";
import { DressType } from "../../common/types";
import { getDressListing } from "@/api/dress";
import {
  DEFAULT_SORT,
  activeFilterValues,
  dressQueryKey,
  parseDressQuery,
  totalPagesFor,
  type DressQuery,
  type DressSort,
} from "../../lib/dresses/dressQuery";

export type DressPageResult = { items: DressType[]; total: number };

interface DressContextProps {
  /** The query the URL currently describes. The URL is the only source of truth. */
  query: DressQuery;
  items: DressType[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  toggleFilter: (value: string, on: boolean) => void;
  setSort: (sort: DressSort) => void;
  setPage: (page: number) => void;
}

const dressContext = React.createContext<DressContextProps>(
  {} as DressContextProps,
);

interface DressContextProviderProps extends React.PropsWithChildren {
  /** Page one of the default query, from the page's own getStaticProps. */
  initialPage: DressPageResult;
}

const EMPTY_PAGE: DressPageResult = { items: [], total: 0 };

const DressContextProvider = ({
  children,
  initialPage,
}: DressContextProviderProps) => {
  const router = useRouter();

  // Both derived in one memo so they cannot disagree, and so the effect below
  // has a single dependency rather than an object rebuilt on every render.
  const search = React.useMemo(() => {
    const query = parseDressQuery(router.query);
    return { query, key: dressQueryKey(query) };
  }, [router.query]);

  // Pages already fetched this session, keyed by query. Deliberately in-memory
  // and per-mount: it exists to make going back a page free, not to outlive the
  // tab. Anything longer-lived is the CDN's job, which already holds these
  // responses for an hour.
  const cacheRef = React.useRef<Map<string, DressPageResult>>();
  if (!cacheRef.current) {
    cacheRef.current = new Map([
      [dressQueryKey(parseDressQuery({})), initialPage],
    ]);
  }

  const [result, setResult] = React.useState<DressPageResult>(initialPage);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    // Before the router is ready, router.query is empty and every URL looks
    // like the default one — acting on that would fetch page 1 over the top of
    // a deep link to page 4.
    if (!router.isReady) return;

    const cached = cacheRef.current!.get(search.key);
    if (cached) {
      setResult(cached);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setIsError(false);

    getDressListing(search.query)
      .then(({ data }) => {
        const page: DressPageResult = {
          items: (data?.items ?? []) as DressType[],
          total: Number(data?.total ?? 0),
        };
        cacheRef.current!.set(search.key, page);
        if (!cancelled) setResult(page);
      })
      .catch((error) => {
        console.error(error);
        // Show the empty state rather than the previous page's dresses, which
        // would read as "your filter matched these".
        if (!cancelled) {
          setResult(EMPTY_PAGE);
          setIsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // A slow request for a filter the customer has already moved on from must
    // not overwrite the results of the one they are now looking at.
    return () => {
      cancelled = true;
    };
  }, [router.isReady, search]);

  const navigate = React.useCallback(
    (next: { filters?: string[]; sort?: DressSort; page?: number }) => {
      const filters = next.filters ?? activeFilterValues(search.query);
      const sort = next.sort ?? search.query.sort;
      // Any change to what is being listed returns to page one: page 5 of the
      // unfiltered catalogue often does not exist once a filter is applied.
      const page = next.page ?? 1;

      const query: Record<string, string | string[]> = {};
      // Defaults are left out entirely, so /dresses stays /dresses and the
      // existing /dresses?filter=customer_faves links keep their exact shape.
      if (filters.length > 0) query.filter = filters;
      if (sort !== DEFAULT_SORT) query.sort = sort;
      if (page > 1) query.page = String(page);

      // Shallow: the data comes from the API route, so re-running
      // getStaticProps would fetch page one again and throw it away.
      router.push({ pathname: "/dresses", query }, undefined, {
        shallow: true,
        scroll: false,
      });
    },
    [router, search.query],
  );

  const toggleFilter = React.useCallback(
    (value: string, on: boolean) => {
      const current = activeFilterValues(search.query);
      navigate({
        filters: on
          ? [...new Set([...current, value])]
          : current.filter((filter) => filter !== value),
      });
    },
    [navigate, search.query],
  );

  const setSort = React.useCallback(
    (sort: DressSort) => navigate({ sort }),
    [navigate],
  );

  const setPage = React.useCallback(
    (page: number) => navigate({ page }),
    [navigate],
  );

  return (
    <dressContext.Provider
      value={{
        query: search.query,
        items: result.items,
        total: result.total,
        totalPages: totalPagesFor(result.total, search.query.pageSize),
        isLoading,
        isError,
        toggleFilter,
        setSort,
        setPage,
      }}
    >
      {children}
    </dressContext.Provider>
  );
};

export function useDressContext() {
  return React.useContext(dressContext);
}

export default DressContextProvider;
