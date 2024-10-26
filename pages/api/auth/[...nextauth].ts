import NextAuth, { DefaultSession } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider, {
  SendVerificationRequestParams,
} from "next-auth/providers/email";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../lib/db/db";
import { Resend } from "resend";
import { text } from "stream/consumers";
import MagicLinkEmail from "@/components/Emails/MagicLinkEmail";
declare module "next-auth" {
  interface Session {
    user: {
      mobile: number;
      instagramHandle: string;
    } & DefaultSession["user"];
  }
}

export const sendVerificationRequest = async (
  params: SendVerificationRequestParams
) => {
  let {
    identifier: email,
    url,
    provider: { from },
  } = params;

  const { host } = new URL(url);

  const text = (url: string, host: string) => {
    return `Sign in to ${host}\n${url}\n\n`;
  };

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    console.log("is ths working", process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["delivered@resend.dev"],
      subject: "Verify your Dress for Less account",
      text: text(url, host),
      react: MagicLinkEmail({ url, host }),
    });
  } catch (error) {
    console.log({ error });
  }
};

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    EmailProvider({
      from: "noreply@example.com",
      // Custom sendVerificationRequest() function
      sendVerificationRequest,
    }),
    // {
    //   id: "resend",
    //   type: "email",
    //   sendVerificationRequest,
    // },
    // ...add more providers here
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  adapter: MongoDBAdapter(clientPromise),
};

export default NextAuth(authOptions);
