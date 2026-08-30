// 📌 context/GlobalContext.tsx
import React from "react";
import { DressType, Faq } from "../../common/types";
import { getDressById as fetchDressById } from "@/api/dress";
import { getAllFaq } from "@/api/faq";

interface GlobalProps {
  // Resolves one dress, from cache when it has been asked for before. This is
  // how the cart, checkout and the receipt find their dresses — a handful of
  // known ids never justified downloading the catalogue to look them up, which
  // is exactly what this context used to do on every route in the app.
  //
  // Deliberately separate from the /dresses page cache: that one holds the
  // trimmed listing projection, and these callers read description, length,
  // stretch and rrp, which it does not carry. Sharing the two would hand them a
  // record with silently missing fields rather than an error.
  getDressById: (id: string) => Promise<DressType | undefined>;
  faq: Faq[];
}

const globalContext = React.createContext<GlobalProps>({} as GlobalProps);

const GlobalContextProvider = ({ children }: React.PropsWithChildren) => {
  const [faq, setFaq] = React.useState<Faq[]>([]);

  const dressById = React.useRef(new Map<string, DressType>());
  // Two cart lines for the same dress mount together; without this they would
  // each fire their own request for it.
  const inFlight = React.useRef(
    new Map<string, Promise<DressType | undefined>>(),
  );

  const getDressById = React.useCallback(async (id: string) => {
    const cached = dressById.current.get(id);
    if (cached) return cached;

    const pending = inFlight.current.get(id);
    if (pending) return pending;

    const request = fetchDressById(id)
      .then(({ data }) => {
        const dress = data as unknown as DressType;
        dressById.current.set(id, dress);
        return dress;
      })
      .catch((error) => {
        console.error(error);
        return undefined;
      })
      .finally(() => {
        inFlight.current.delete(id);
      });

    inFlight.current.set(id, request);
    return request;
  }, []);

  React.useEffect(() => {
    // A few dozen short documents, and /faq has no getStaticProps of its own.
    getAllFaq()
      .then((data) => setFaq(data.data as unknown as Faq[]))
      .catch((error) => console.error(error));
  }, []);

  return (
    <globalContext.Provider value={{ getDressById, faq }}>
      {children}
    </globalContext.Provider>
  );
};

export function useGlobalContext() {
  return React.useContext(globalContext);
}

export default GlobalContextProvider;
