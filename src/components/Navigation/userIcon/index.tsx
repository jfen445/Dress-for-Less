import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Button from "@/components/Button";

const LoggedOnIcon = () => {
  const { data: session } = useSession();

  if (session && session.user) {
    return (
      <>
        Signed in as {session.user.email} <br />
        <Button variant="ghost" onClick={() => signOut()}>
          Sign out
        </Button>
      </>
    );
  }
  return (
    <>
      Not signed in <br />
      <Button variant="ghost" onClick={() => signIn()}>
        Sign in
      </Button>
    </>
  );
};

export default LoggedOnIcon;
