import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider, {
  SendVerificationRequestParams,
} from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../lib/db/db";
import { Resend } from "resend";
import MagicLinkEmail from "@/components/Emails/MagicLinkEmail";
import { UserType } from "../../../common/types";
import { createUser, findUserWithPassword } from "../../../lib/db/user-dao";
import bcrypt from "bcryptjs";
import { PASSWORD_SALT_ROUNDS } from "../../../common/constants/auth";

// A constant, valid bcrypt hash used to keep `authorize` response time uniform
// when the email doesn't exist (or has no password): we always run a compare so
// timing can't reveal whether an account is registered. Generated at the same
// cost as real hashes so the timings match.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "unmatchable-placeholder-password",
  PASSWORD_SALT_ROUNDS,
);

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
      maxAge: 15 * 60, // 15 minutes
      sendVerificationRequest: sendVerificationRequest,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await findUserWithPassword(email);

        // Always compare against *some* hash so a missing user/password takes
        // the same time as a wrong password (no email enumeration via timing).
        const hash = user?.password ?? DUMMY_PASSWORD_HASH;
        const passwordMatches = await bcrypt.compare(password, hash);

        if (!user || !user.password || !passwordMatches) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? "",
          image: user.photo ?? null,
        };
      },
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
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + "/account";
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
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
