"use client";

import * as React from "react";

const DressPage = () => {
  console.log("efaef");

  React.useEffect(() => {
    console.log("rednerings", process.env.NEXT_PUBLIC_SANITY_DATASET);
  }, []);

  return <div className="bg-red-100">hello</div>;
};

export default DressPage;
