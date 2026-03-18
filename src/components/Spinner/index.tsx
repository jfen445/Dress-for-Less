import React from "react";
import LoadingSpin from "react-loading-spin";

interface SpinnerProps {
  message?: string;
}

const Spinner = ({ message }: SpinnerProps) => {
  return (
    <>
      <div className="flex flex-col items-center justify-center my-16">
        <LoadingSpin
          width="15px"
          size="20px"
          primaryColor="#881337"
          secondaryColor="#fda4af"
          numberOfRotationsInAnimation={2}
        />
        {message && (
          <p className="text-sm font-medium text-gray-600 mt-4">{message}</p>
        )}
      </div>
    </>
  );
};

export default Spinner;
