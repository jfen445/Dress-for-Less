import { useCallback } from "react";

function useLocalStorage<T>(key: string) {
  const getItems = useCallback((): T | null => {
    if (typeof window === "undefined") return null;

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch (error) {
      console.warn(`Error getting localStorage key "${key}":`, error);
      return null;
    }
  }, [key]);

  const setItems = useCallback(
    (value: T): void => {
      if (typeof window === "undefined") return;

      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  const clearItems = useCallback((): void => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key]);

  return { getItems, setItems, clearItems };
}

export default useLocalStorage;
