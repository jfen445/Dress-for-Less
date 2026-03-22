import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider, {
  SendVerificationRequestParams,
} from "next-auth/providers/email";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../lib/db/db";
import { Resend } from "resend";
import MagicLinkEmail from "@/components/Emails/MagicLinkEmail";
import { UserType } from "../../../common/types";
import { createUser } from "../../../lib/db/user-dao";

declare module "next-auth" {
  interface Session {
    user: {
      mobile: number;
      instagramHandle: string;
    } & DefaultSession["user"];
  }
}

export const sendVerificationRequest = async (
  params: SendVerificationRequestParams,
) => {
  const { identifier, url } = params;

  const { host } = new URL(url);

  const text = (url: string, host: string) => {
    return `Sign in to ${host}\n${url}\n\n`;
  };

  try {
    const resend = new Resend(process.env.RESEND_API_KEY as string);

    resend.emails.send({
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
      return baseUrl + "/account"; // Ensure it dynamically adjusts to your environment
    },
    // // Called when user signs in - update your custom MongoDB collection
    async signIn({ user, profile }) {
      try {
        const update: UserType = {
          email: user.email ?? "",
          name: user.name || profile?.name || "",
          photo: user.image || profile?.image || "",
          mobileNumber: "", // Will be filled in by user later
          instagramHandle: "",
          role: "user",
        };

        await createUser(update);

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return true; // Still allow sign in even if DB update fails
      }
    },
  },
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_URL,
};

export default NextAuth(authOptions);
