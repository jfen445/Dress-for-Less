import React from "react";
import LoadingSpin from "react-loading-spin";

const Spinner = () => {
  return (
    <LoadingSpin
      width="15px"
      size="20px"
      primaryColor="#881337"
      secondaryColor="#fda4af"
      numberOfRotationsInAnimation={2}
    />
  );
};

export default Spinner;
