import Input from "@/components/Input";

const BillingForm = () => {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
      <div className="sm:col-span-3">
        <label
          htmlFor="billingCompany"
          className="block text-sm font-medium text-gray-700"
        >
          Company <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="mt-1">
          <Input
            id="billingCompany"
            name="billingCompany"
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
          <Input
            id="billingAddress"
            name="billingAddress"
            type="text"
            autoComplete="street-address"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="sm:col-span-3">
        <label
          htmlFor="billingApartment"
          className="block text-sm font-medium text-gray-700"
        >
          Apartment, suite, etc.{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="mt-1">
          <Input
            id="billingApartment"
            name="billingApartment"
            type="text"
            autoComplete="address-line2"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="sm:col-span-3">
        <label
          htmlFor="billingSuburb"
          className="block text-sm font-medium text-gray-700"
        >
          Suburb
        </label>
        <div className="mt-1">
          <Input
            id="billingSuburb"
            name="billingSuburb"
            type="text"
            autoComplete="address-level2"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
            id="billingCity"
            name="billingCity"
            type="text"
            autoComplete="address-level2"
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
            id="billingRegion"
            name="billingRegion"
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
            id="billingPostCode"
            name="billingPostCode"
            type="text"
            autoComplete="postal-code"
          />
        </div>
      </div>
    </div>
  );
};

export default BillingForm;
