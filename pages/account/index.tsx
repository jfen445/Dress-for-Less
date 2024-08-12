import Account from "@/components/Account";
import Input from "@/components/Input";
import { useSession } from "next-auth/react";
import { notFound, useRouter } from "next/navigation";
import React from "react";

const AccountPage = () => {
  const { status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (status === "unauthenticated") {
    router.push("/");
  }

  return (
    <>
      <div className="bg-white">
        <Account />
      </div>
    </>
  );
};

export default AccountPage;
