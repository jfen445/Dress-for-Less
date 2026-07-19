import React from "react";
import Input from "@/components/Input";
import { ProductContext } from "../..";
import AddressAutocomplete from "./AddressAutocomplete";
import { AddressSuggestion, getAddressDetail } from "@/api/address";

const AddressForm = () => {
  const { setValidatedAddress } = React.useContext(ProductContext);

  const [addressText, setAddressText] = React.useState("");
  const [suburb, setSuburb] = React.useState("");
  const [city, setCity] = React.useState("");
  const [postCode, setPostCode] = React.useState("");
  const [isRuralDelivery, setIsRuralDelivery] = React.useState(false);
  const [resolveError, setResolveError] = React.useState<string | null>(null);

  const handleAddressTextChange = (text: string) => {
    setAddressText(text);
    setIsRuralDelivery(false);
    setResolveError(null);
    setValidatedAddress(null);
  };

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setResolveError(null);

    try {
      const { data } = await getAddressDetail(suggestion.addressId);
      const detail = data.address;

      // Suburb/city/postcode already have their own fields — only the
      // street line (number + street + type) belongs in the address input.
      const streetLine =
        [detail.streetNumber, detail.street, detail.streetType]
          .filter(Boolean)
          .join(" ") || suggestion.fullAddress;

      setAddressText(streetLine);
      if (detail.suburb) setSuburb(detail.suburb);
      if (detail.city) setCity(detail.city);
      if (detail.postcode) setPostCode(detail.postcode);
      setIsRuralDelivery(detail.isRuralDelivery);

      setValidatedAddress({
        addressText: streetLine,
        nzPostAddressId: suggestion.addressId,
        nzPostDpid: detail.dpid,
        isRuralDelivery: detail.isRuralDelivery,
        ruralDeliveryNumber: detail.ruralDeliveryNumber,
      });
    } catch (err) {
      console.error("Failed to resolve NZ Post address detail", err);
      setIsRuralDelivery(false);
      setValidatedAddress(null);
      setResolveError(
        "Could not confirm this address's delivery details. You can continue with the address as entered.",
      );
    }
  };

  return (
    <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
      <div className="sm:col-span-3">
        <label
          htmlFor="company"
          className="block text-sm font-medium text-gray-700"
        >
          Company <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="mt-1">
          <Input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="sm:col-span-3">
        <label
          htmlFor="address"
          className="block text-sm font-medium text-gray-700"
        >
          Address
        </label>
        <div className="mt-1">
          <AddressAutocomplete
            value={addressText}
            onInputChange={handleAddressTextChange}
            onSelect={handleSelectSuggestion}
          />
        </div>
        {isRuralDelivery && (
          <p className="mt-1 text-xs font-medium text-amber-700">
            Rural delivery — $5 surcharge applies.
          </p>
        )}
        {resolveError && (
          <p className="mt-1 text-xs text-gray-500">{resolveError}</p>
        )}
      </div>

      <div className="sm:col-span-3">
        <label
          htmlFor="apartment"
          className="block text-sm font-medium text-gray-700"
        >
          Apartment, suite, etc.{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="mt-1">
          <Input
            id="apartment"
            name="apartment"
            type="text"
            autoComplete="address-line2"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="sm:col-span-3">
        <label
          htmlFor="suburb"
          className="block text-sm font-medium text-gray-700"
        >
          Suburb
        </label>
        <div className="mt-1">
          <Input
            id="suburb"
            name="suburb"
            type="text"
            autoComplete="address-level2"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
            value={suburb}
            onChange={(e) =>
              setSuburb((e.target as HTMLInputElement).value)
            }
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="city"
          className="block text-sm font-medium text-gray-700"
        >
          City
        </label>
        <div className="mt-1">
          <Input
            id="city"
            name="city"
            type="text"
            autoComplete="address-level2"
            value={city}
            onChange={(e) => setCity((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="region"
          className="block text-sm font-medium text-gray-700"
        >
          Country
        </label>
        <div className="mt-1">
          <Input
            value={"New Zealand"}
            id="region"
            name="region"
            type="text"
            autoComplete="address-level1"
            disabled
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="postal-code"
          className="block text-sm font-medium text-gray-700"
        >
          Postal code
        </label>
        <div className="mt-1">
          <Input
            id="postCode"
            name="postCode"
            type="text"
            autoComplete="postal-code"
            required
            value={postCode}
            onChange={(e) =>
              setPostCode((e.target as HTMLInputElement).value)
            }
          />
        </div>
      </div>

      <div className="sm:col-span-3">
        <label
          htmlFor="instructions"
          className="block text-sm font-medium text-gray-700"
        >
          Delivery instructions{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="mt-1">
          <textarea
            id="instructions"
            name="instructions"
            rows={3}
            className="block border border-rose-900 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:border-black disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
};

export default AddressForm;
