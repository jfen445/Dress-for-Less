import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider, {
  SendVerificationRequestParams,
} from "next-auth/providers/email";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../lib/db/db";
import { Resend } from "resend";
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
  const { identifier, url } = params;

  const { host } = new URL(url);

  const text = (url: string, host: string) => {
    return `Sign in to ${host}\n${url}\n\n`;
  };

  try {
    const resend = new Resend(process.env.RESEND_API_KEY as string);

    await resend.emails.send({
      from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
      to: [identifier],
      subject: "Log into your Dress for Less account",
      text: text(url, host),
      react: MagicLinkEmail({ url, host }),
    });
  } catch (error) {
    console.log({ error });
  }
};

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {},
      },
      checks: ["none"],
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: sendVerificationRequest,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return baseUrl; // Ensure it dynamically adjusts to your environment
    },
  },
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_URL,
};

export default NextAuth(authOptions);
