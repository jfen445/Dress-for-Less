import React from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { searchAddresses, AddressSuggestion } from "@/api/address";

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

interface AddressAutocompleteProps {
  value: string;
  onInputChange: (text: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onInputChange,
  onSelect,
}) => {
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>(
    [],
  );
  const [statusMessage, setStatusMessage] = React.useState<string | null>(
    null,
  );
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSearch = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setStatusMessage(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await searchAddresses(text.trim());
        setSuggestions(data.addresses);
        setStatusMessage(
          data.addresses.length === 0
            ? "No matching address found — you can continue typing it manually."
            : null,
        );
      } catch {
        setSuggestions([]);
        setStatusMessage(
          "Address lookup is temporarily unavailable. You can enter your address manually.",
        );
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    onInputChange(text);
    runSearch(text);
  };

  const handleComboboxChange = (selectedText: string | null) => {
    if (!selectedText) return;
    const suggestion = suggestions.find(
      (s) => s.fullAddress === selectedText,
    );
    setSuggestions([]);
    setStatusMessage(null);
    if (suggestion) {
      onSelect(suggestion);
    }
  };

  return (
    <Combobox value={value} onChange={handleComboboxChange}>
      <div className="relative">
        <ComboboxInput
          id="address"
          name="address"
          autoComplete="street-address"
          required
          className="border border-rose-900 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          onChange={handleInputChange}
        />
        {suggestions.length > 0 && (
          <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg">
            {suggestions.map((s) => (
              <ComboboxOption
                key={s.addressId}
                value={s.fullAddress}
                className="cursor-pointer px-3 py-2 data-[focus]:bg-indigo-600 data-[focus]:text-white"
              >
                {s.fullAddress}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        )}
      </div>
      {statusMessage && (
        <p className="mt-1 text-xs text-gray-500">{statusMessage}</p>
      )}
    </Combobox>
  );
};

export default AddressAutocomplete;
