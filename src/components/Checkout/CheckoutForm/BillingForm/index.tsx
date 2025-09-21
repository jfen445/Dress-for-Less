import Input from "@/components/Input";

const BillingForm = () => {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
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
            name="address"
            type="text"
            autoComplete="street-address"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="sm:col-span-3">
        <label
          htmlFor="address"
          className="block text-sm font-medium text-gray-700"
        >
          Suburb
        </label>
        <div className="mt-1">
          <Input
            id="billingSuburb"
            name="suburb"
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
            name="city"
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
            id="billingPostCode"
            name="postCode"
            type="text"
            autoComplete="postal-code"
          />
        </div>
      </div>
    </div>
  );
};

export default BillingForm;
